# backend/app/video_routes.py
"""视频播放路由 - 提供示例视频流媒体服务"""

from flask import Blueprint, send_file
import os

video_bp = Blueprint('video', __name__, url_prefix='/api/video')

# 示例视频目录
EXAMPLE_VIDEO_DIR = os.path.join(os.path.dirname(__file__), "../../example")


@video_bp.route('/example/<filename>')
def serve_example_video(filename):
    """提供示例视频文件"""
    video_path = os.path.join(EXAMPLE_VIDEO_DIR, filename)
    
    if not os.path.exists(video_path):
        return jsonify({"error": "视频文件不存在"}), 404
    
    return send_file(
        video_path,
        mimetype='video/mp4',
        as_attachment=False
    )
