"""视频播放路由 - 提供视频文件访问服务（通用相对路径版）"""

from flask import Blueprint, send_file, abort
from werkzeug.exceptions import HTTPException
import os

video_bp = Blueprint('video', __name__, url_prefix='/api/video')

# 获取backend目录的绝对路径
current_file = os.path.abspath(__file__)
# 向上两级：app → backend
BACKEND_DIR = os.path.dirname(os.path.dirname(current_file))

# 打印路径信息用于调试
print(f"[DEBUG] video_routes.py current file: {current_file}")
print(f"[DEBUG] video_routes.py BACKEND_DIR: {BACKEND_DIR}")


def _normalize_video_path(video_path: str) -> str:
    """
    将前端传入路径规范化为 backend 下的相对路径。
    支持：
    - uploads/xxx.mp4
    - C:/.../backend/uploads/xxx.mp4
    - C:\\...\\backend\\uploads\\xxx.mp4
    """
    raw = (video_path or "").strip()

    # 统一分隔符，去掉前导斜杠
    p = raw.replace("\\", "/").lstrip("/")

    # 若包含 backend/uploads，则截取为 uploads/...
    marker = "backend/uploads/"
    idx = p.lower().find(marker)
    if idx != -1:
        p = p[idx + len("backend/"):]  # -> uploads/xxx.mp4

    # 若是绝对盘符路径（如 C:/...），兜底取文件名放到 uploads 下
    # 避免 join 后出现 backend/uploads/C:/...
    if ":" in p and not p.startswith("uploads/"):
        p = f"uploads/{os.path.basename(p)}"

    # 再次清理
    p = p.replace("\\", "/").lstrip("/")

    return p


@video_bp.route('/<path:video_path>')
def serve_video(video_path):
    """
    提供视频文件访问（支持通用相对路径）
    GET /api/video/<path>
    """
    try:
        safe_video_path = _normalize_video_path(video_path)
        full_path = os.path.abspath(os.path.join(BACKEND_DIR, safe_video_path))

        # 打印路径信息用于调试
        print(f"[DEBUG] Requested video: {video_path}")
        print(f"[DEBUG] Normalized path: {safe_video_path}")
        print(f"[DEBUG] Full path: {full_path}")
        print(f"[DEBUG] File exists: {os.path.exists(full_path)}")

        # 安全检查：确保路径在backend目录内
        if not full_path.startswith(BACKEND_DIR + os.sep) and full_path != BACKEND_DIR:
            abort(403, description="Access denied")

        if not os.path.exists(full_path):
            abort(404, description=f"Video not found: {safe_video_path} (Full path: {full_path})")

        if not os.path.isfile(full_path):
            abort(400, description="Not a file")

        return send_file(full_path, mimetype='video/mp4')

    except HTTPException:
        # 保留 abort(404/403/400) 原状态码，不要被包成500
        raise
    except Exception as e:
        print(f"Error serving video: {e}")
        abort(500, description=f"Internal server error: {str(e)}")