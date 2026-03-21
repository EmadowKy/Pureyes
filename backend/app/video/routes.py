# backend/app/video/routes.py
"""视频模块的 API 路由 - 提供视频文件访问和管理"""

from flask import Blueprint, send_file, abort, request
import os
from .views import upload_video, delete_video, rename_video, tick_video, get_video_list, get_single_video

video_bp = Blueprint('video', __name__, url_prefix='/api/video')

# 从当前文件路径计算backend根目录
current_file = os.path.abspath(__file__)
# 向上三级：video → app → backend
backend_root = os.path.dirname(os.path.dirname(os.path.dirname(current_file)))


@video_bp.route('/<path:video_path>')
def serve_video(video_path):
    """
    提供视频文件访问
    GET /api/video/<path>
    
    Args:
        video_path: 视频的相对路径，例如 'example/1.mp4'
    
    Returns:
        视频文件
    """
    try:
        # 构建完整的文件路径
        full_path = os.path.join(backend_root, video_path)
        
        # 安全检查：确保路径在backend根目录内
        if not os.path.abspath(full_path).startswith(backend_root):
            abort(403, description="Access denied")
        
        # 打印路径信息用于调试
        print(f"[DEBUG] Requested video: {video_path}")
        print(f"[DEBUG] Full path: {full_path}")
        print(f"[DEBUG] Backend root: {backend_root}")
        
        # 检查文件是否存在
        if not os.path.exists(full_path):
            abort(404, description=f"Video not found: {video_path}")
        
        # 检查是否为文件
        if not os.path.isfile(full_path):
            abort(400, description="Not a file")
        
        # 发送文件
        return send_file(full_path, mimetype='video/mp4')
        
    except Exception as e:
        print(f"Error serving video: {e}")
        abort(500, description=f"Internal server error: {str(e)}")


# 视频管理API路由
@video_bp.route('/upload', methods=['POST'])
def api_upload_video():
    """
    上传视频
    POST /api/video/upload
    """
    return upload_video()


@video_bp.route('/delete', methods=['POST'])
def api_delete_video():
    """
    删除视频
    POST /api/video/delete
    """
    return delete_video()


@video_bp.route('/rename', methods=['POST'])
def api_rename_video():
    """
    重命名视频
    POST /api/video/rename
    """
    return rename_video()


@video_bp.route('/tick', methods=['POST'])
def api_tick_video():
    """
    勾选视频
    POST /api/video/tick
    """
    return tick_video()


@video_bp.route('/list', methods=['GET'])
def api_get_video_list():
    """
    获取视频列表
    GET /api/video/list
    """
    return get_video_list()


@video_bp.route('/info', methods=['GET'])
def api_get_single_video():
    """
    获取单个视频信息
    GET /api/video/info?video_id=<id>
    """
    return get_single_video()
