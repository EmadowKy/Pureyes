import os
import uuid
import cv2
from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
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
    duration = db.Column(db.Float, default = 0.0)  # 视频时长，单位秒
    is_ticked = db.Column(db.Boolean, default = False)
    
    def to_dict(self):
        # 将时长转换为分:秒格式
        minutes = int(self.duration // 60)
        seconds = int(self.duration % 60)
        duration_str = f"{minutes:02d}:{seconds:02d}"
        # 从 video_id 动态构建相对路径，不依赖数据库的 video_path 字段
        relative_video_path = f"uploads/{self.video_id}.mp4"
        return {
            "video_id": self.video_id,
            "uid": self.uid,
            "video_name": self.video_name,
            "video_path": relative_video_path,
            "duration": duration_str
        }

# 视频存储路径
VIDEO_PATH = Config.VIDEO_UPLOAD_PATH
os.makedirs(VIDEO_PATH, exist_ok = True)


# 统一鉴权：所有视频操作应使用 JWT。使用装饰器和 get_jwt_identity()/get_jwt() 获取用户信息。



# 上传视频
@jwt_required()
def upload_video():
    # 从 JWT 获取 uid（identity）与 username（claims）
    uid = get_jwt_identity()
    claims = get_jwt()
    username = claims.get("username")

    video_name = request.form.get("video_name")
    video_file = request.files.get("video_file")

    if not uid:
        return fail(code=401, msg="token无效或已过期")
    if not video_name:
        return fail(code=400, msg="缺少视频名称")
    if not video_file:
        return fail(code=400, msg="缺少视频文件")

    try:
        video_id = str(uuid.uuid4()).replace("-", "")[:32]
        # uuid.uuid4()生成一个随机的UUID对象，str()将其转换为字符串，replace("-", "")去掉其中的连字符，[:32]取前32个字符作为video_id。
        # 只使用video_id作为文件名，不包含视频名称，这样路径不会随名称变化
        video_filename = f"{video_id}.mp4" 
        full_video_path = os.path.join(VIDEO_PATH, video_filename)

        # 保存视频到服务器
        video_file.save(full_video_path)

        # 计算视频时长
        def get_video_duration(video_path):
            try:
                cap = cv2.VideoCapture(video_path)
                if not cap.isOpened():
                    return 0.0
                fps = cap.get(cv2.CAP_PROP_FPS)
                frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                duration = frame_count / fps if fps > 0 else 0.0
                cap.release()
                return duration
            except Exception as e:
                print(f"计算视频时长失败: {str(e)}")
                return 0.0

        duration = get_video_duration(full_video_path)

        # 不存储 video_path 到数据库，运行时动态生成
        # 这样避免了路径格式转换的复杂性

        #写入数据库
        video = Video(
            video_id = video_id,
            uid = uid,
            video_name = video_name,
            video_path = None,  # 不依赖数据库的路径字段，运行时从 video_id 生成
            duration = duration
        )
        db.session.add(video) # 将新创建的视频对象添加到数据库会话中，准备进行数据库操作。
        db.session.commit() # 提交数据库会话，将更改保存到数据库中。
        return success(data = video.to_dict(), msg = "视频上传成功")
    except Exception as e:
        db.session.rollback() # 回滚数据库会话，撤销未提交的更改。
        return fail(code=500, msg=f"视频上传失败：{str(e)}")
        # code=500表示服务器内部错误

# 删除视频
@jwt_required()
def delete_video():
    data = request.get_json() or {}
    video_id = data.get("video_id")

    uid = get_jwt_identity()
    if not uid:
        return fail(code=401, msg="token无效或已过期")
    if not video_id:
        return fail(code=400, msg="缺少视频ID")
    
    try:
        # 查询视频是否存在且属于当前用户
        video = Video.query.filter_by(video_id = video_id, uid = uid).first()
        if not video:
            return fail(code = 404, msg = "视频不存在")
        
        # 从 video_id 直接构建路径
        absolute_video_path = os.path.join(VIDEO_PATH, f"{video_id}.mp4")
        
        # 删除视频文件
        if os.path.exists(absolute_video_path):
            try:
                os.remove(absolute_video_path)
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
@jwt_required()
def rename_video():
    data = request.get_json() or {}
    video_id = data.get("video_id")
    new_name = data.get("new_name")

    uid = get_jwt_identity()
    if not uid:
        return fail(code=401, msg="token无效或已过期")
    if not video_id:
        return fail(code=400, msg="缺少视频ID")
    if not new_name:
        return fail(code=400, msg="缺少新视频名称")

    try:
        video = Video.query.filter_by(video_id = video_id, uid = uid).first()
        if not video:
            return fail(code = 404, msg = "视频不存在")
        
        # 从 video_id 直接构建路径
        absolute_video_path = os.path.join(VIDEO_PATH, f"{video_id}.mp4")
        
        # 检查视频文件是否存在
        if not os.path.exists(absolute_video_path):
            return fail(code = 404, msg = "视频文件不存在")

        # 只更新数据库中的视频名称
        video.video_name = new_name
        db.session.commit() 
        
        # 返回更新后的视频信息
        return success(
            data = {
                "video_id": video.video_id,
                "uid": video.uid,
                "video_name": video.video_name,
                "video_path": f"uploads/{video.video_id}.mp4",
                "duration": f"{int(video.duration // 60):02d}:{int(video.duration % 60):02d}"
            },
            msg = "视频重命名成功"
        )
    except Exception as e:
        db.session.rollback() 
        return fail(code=500, msg=f"视频重命名失败：{str(e)}")

# 勾选视频
@jwt_required()
def tick_video():
    data = request.get_json() or {}
    video_ids = data.get("video_ids", []) # 勾选视频的ID列表
    is_ticked = data.get("is_ticked")
    if not isinstance(video_ids, list) or not video_ids:
        return fail(code=400, msg="视频ID列表不能为空")

    uid = get_jwt_identity()
    if not uid:
        return fail(code=401, msg="token无效或已过期")
    
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
@jwt_required()
def get_video_list():
    """
    获取用户的视频列表
    直接从数据库取元数据（video_name, upload_time等），
    路径采用统一格式：uploads/{video_id}.mp4
    """
    uid = get_jwt_identity()
    if not uid:
        return fail(code=401, msg="token无效或已过期")

    try:
        # 从数据库取用户上传的视频元数据
        videos = Video.query.filter_by(uid = uid).order_by(Video.upload_time.desc()).all()
        
        video_list = []
        for video in videos:
            # 直接构建相对路径，不依赖数据库的 video_path 字段
            relative_video_path = f"uploads/{video.video_id}.mp4"
            
            video_list.append({
                "video_id": video.video_id,
                "uid": video.uid,
                "video_name": video.video_name,
                "video_path": relative_video_path,  # 统一格式相对路径
                "duration": f"{int(video.duration // 60):02d}:{int(video.duration % 60):02d}"
            })
        
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
@jwt_required()
def get_single_video():
    uid = get_jwt_identity()
    video_id = request.args.get("video_id")
    if not uid:
        return fail(code=401, msg="token无效或已过期")
    if not video_id:
        return fail(code=400, msg="缺少视频ID")

    try:
        video = Video.query.filter_by(video_id = video_id, uid = uid).first()
        if not video:
            return fail(code = 404, msg = "视频不存在")
        return success(data = video.to_dict(), msg = "获取视频信息成功")
    except Exception as e:
        return fail(code=500, msg=f"获取视频信息失败：{str(e)}")