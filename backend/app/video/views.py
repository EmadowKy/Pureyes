import os
import uuid
from flask import request
from datetime import datetime

from app.core.db import db
from app.core.config import Config
from app.core.response import success, fail

class Video(db.Model):
    __tablename__ = "video"
    video_id = db.Column(db.String(32), primary_key = True)
    uid = db.Column(db.String(32))
    video_name = db.Column(db.String, nullable = False)
    video_path = db.Column(db.String)
    upload_time = db.Column(db.DateTime, default = datetime.now)
    is_ticked = db.Column(db.Boolean, default = False)
    
    def to_dict(self):
        return {
            "video_id": self.video_id,
            "uid": self.uid,
            "video_name": self.video_name,
            "video_path": self.video_path,
            "upload_time": self.upload_time.strftime("%Y-%m-%d %H:%M:%S")
        }

# 视频存储路径
VIDEO_PATH = Config.VIDEO_UPLOAD_PATH
os.makedirs(VIDEO_PATH, exist_ok = True)


# token校验工具函数[模拟]
def get_uid_from_token(token):
    # """从token获取真实UID（后续替换为团队真实接口）"""
    # 临时模拟：token有效则返回uid，无效返回None
    if token and token.startswith("valid_"):
        return token.replace("valid_", "")
    return None



# 上传视频
def upload_video():
    token = request.form.get("token")
    video_name = request.form.get("video_name")
    video_file = request.files.get("video_file")

    if not token:
        return fail(code = 400, msg = "缺少token")
    if not video_name:
        return fail(code = 400, msg = "缺少视频名称")
    if not video_file:
        return fail(code = 400, msg = "缺少视频文件")
    
    uid = get_uid_from_token(token)
    if not uid:
        return fail(code = 401, msg = "token无效")

    try:
        video_id = str(uuid.uuid4()).replace("-", "")[:32]
        # uuid.uuid4()生成一个随机的UUID对象，str()将其转换为字符串，replace("-", "")去掉其中的连字符，[:32]取前32个字符作为video_id。
        video_filename = f"{video_id}_{video_name}" 
        video_path = os.path.join(VIDEO_PATH, video_filename)

        # 保存视频到服务器
        video_file.save(video_path) 

        #写入数据库
        video = Video(
            video_id = video_id,
            uid = uid,
            video_name = video_name,
            video_path = video_path
        )
        db.session.add(video) # 将新创建的视频对象添加到数据库会话中，准备进行数据库操作。
        db.session.commit() # 提交数据库会话，将更改保存到数据库中。
        return success(data = video.to_dict(), msg = "视频上传成功")
    except Exception as e:
        db.session.rollback() # 回滚数据库会话，撤销未提交的更改。
        return fail(code=500, msg=f"视频上传失败：{str(e)}")
        # code=500表示服务器内部错误

# 删除视频
def delete_video():
    data = request.get_json() or {}
    token = data.get("token")
    video_id = data.get("video_id")

    if not token:
        return fail(code = 400, msg = "缺少token")
    if not video_id:
        return fail(code = 400, msg = "缺少视频ID")
    uid = get_uid_from_token(token)
    if not uid:
        return fail(code = 401, msg = "token无效")
    
    try:
        # 查询视频是否存在且属于当前用户
        video = Video.query.filter_by(video_id = video_id, uid = uid).first()
        if not video:
            return fail(code = 404, msg = "视频不存在")
        
        # 删除视频文件
        if os.path.exists(video.video_path):
            try:
                os.remove(video.video_path)
            except Exception as file_e:
                return fail(code=500, msg=f"视频文件删除失败：{str(file_e)}")
        
        # 删除数据库记录
        db.session.delete(video)
        db.session.commit() 
        return success(msg = "视频删除成功")
    except Exception as e:
        db.session.rollback() 
        return fail(code=500, msg=f"视频删除失败：{str(e)}")

# 重命名视频
def rename_video():
    data = request.get_json() or {}
    token = data.get("token")
    video_id = data.get("video_id")
    new_name = data.get("new_name")

    if not token:
        return fail(code = 400, msg = "缺少token")
    if not video_id:
        return fail(code = 400, msg = "缺少视频ID")
    if not new_name:
        return fail(code = 400, msg = "缺少新视频名称")
    uid = get_uid_from_token(token)
    if not uid:
        return fail(code = 401, msg = "token无效")

    try:
        video = Video.query.filter_by(video_id = video_id, uid = uid).first()
        if not video:
            return fail(code = 404, msg = "视频不存在")
        
        # 重命名视频文件
        if not os.path.exists(video.video_path):
            return fail(code = 404, msg = "视频文件不存在")

        new_filename = f"{video_id}_{new_name}"
        new_path = os.path.join(VIDEO_PATH, new_filename)
        os.rename(video.video_path, new_path)

        # 更新数据库记录
        video.video_name = new_name
        video.video_path = new_path
        db.session.commit() 
        return success(data = video.to_dict(), msg = "视频重命名成功")
    except Exception as e:
        db.session.rollback() 
        return fail(code=500, msg=f"视频重命名失败：{str(e)}")

# 勾选视频
def tick_video():
    data = request.get_json() or {}
    token = data.get("token")
    video_ids = data.get("video_ids", []) # 勾选视频的ID列表
    is_ticked = data.get("is_ticked")
    if not token:
        return fail(code = 400, msg = "缺少token")
    if not isinstance(video_ids, list) or not video_ids:
        return fail(code = 400, msg = "视频ID列表不能为空")
    # 这里检查video_ids是否是一个列表，并且不为空
    
    uid = get_uid_from_token(token)
    if not uid:
        return fail(code = 401, msg = "token无效")
    
    try:
        Video.query.filter(
            Video.video_id.in_(video_ids), 
            Video.uid == uid
        ).update({"is_ticked": is_ticked}) 
        db.session.commit()
        if is_ticked:
            msg = "视频勾选成功"
        else:
            msg = "视频取消勾选成功"
        return success(msg = msg)
    except Exception as e:
        db.session.rollback()
        return fail(code=500, msg=f"视频勾选失败：{str(e)}")

# 查看所有视频的列表
def get_video_list():
    token = request.args.get("token")
    if not token:
        return fail(code = 400, msg = "缺少token")
    uid = get_uid_from_token(token)
    if not uid:
        return fail(code = 401, msg = "token无效")

    try:
        videos = Video.query.filter_by(uid = uid).order_by(Video.upload_time.desc()).all()
        video_list = [video.to_dict() for video in videos]
        total = len(video_list)
        return success(
            data = {
                "videos": video_list,
                "total": total
            },
            msg = "获取视频列表成功"
        )
    except Exception as e:
        return fail(code=500, msg=f"获取视频列表失败：{str(e)}")

# 查看单个视频
def get_single_video():
    token = request.args.get("token")
    video_id = request.args.get("video_id")
    if not token:
        return fail(code = 400, msg = "缺少token")
    if not video_id:
        return fail(code = 400, msg = "缺少视频ID")
    uid = get_uid_from_token(token)
    if not uid:
        return fail(code = 401, msg = "token无效")

    try:
        video = Video.query.filter_by(video_id = video_id, uid = uid).first()
        if not video:
            return fail(code = 404, msg = "视频不存在")
        return success(data = video.to_dict(), msg = "获取视频信息成功")
    except Exception as e:
        return fail(code=500, msg=f"获取视频信息失败：{str(e)}")