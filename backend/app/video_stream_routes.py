"""视频播放路由 - 提供视频文件访问服务（支持实时转码）"""

from flask import Blueprint, send_file, abort, Response, request
from werkzeug.exceptions import HTTPException
import os
import subprocess
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor

video_stream_bp = Blueprint('video_stream', __name__, url_prefix='/api/video')

current_file = os.path.abspath(__file__)
BACKEND_DIR = os.path.dirname(os.path.dirname(current_file))

print(f"[DEBUG] video_stream_routes.py current file: {current_file}")
print(f"[DEBUG] video_stream_bp BACKEND_DIR: {BACKEND_DIR}")

executor = ThreadPoolExecutor(max_workers=2)
transcoded_cache = {}
MAX_CACHE_SIZE = 5


def _normalize_video_path(video_path: str) -> str:
    """
    将前端传入路径规范化为 backend 下的相对路径。
    支持：
    - uploads/xxx.mp4
    - C:/.../backend/uploads/xxx.mp4
    - C:\\...\\backend\\uploads\\xxx.mp4
    """
    raw = (video_path or "").strip()
    p = raw.replace("\\", "/").lstrip("/")

    marker = "backend/uploads/"
    idx = p.lower().find(marker)
    if idx != -1:
        p = p[idx + len("backend/"):]

    if ":" in p and not p.startswith("uploads/"):
        p = f"uploads/{os.path.basename(p)}"

    p = p.replace("\\", "/").lstrip("/")
    return p


def _check_video_compatible(video_path: str) -> tuple:
    """
    使用 ffprobe 检查视频是否为浏览器兼容格式。
    返回 (is_compatible, codec_info, needs_transcode)
    """
    try:
        cmd = [
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_streams', '-show_format', video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)

        if result.returncode != 0:
            return False, "ffprobe failed", True

        import json
        info = json.loads(result.stdout)

        video_stream = None
        audio_stream = None
        for stream in info.get('streams', []):
            if stream.get('codec_type') == 'video':
                video_stream = stream
            elif stream.get('codec_type') == 'audio':
                audio_stream = stream

        if not video_stream:
            return False, "No video stream", True

        video_codec = video_stream.get('codec_name', '')
        profile = video_stream.get('profile', '').lower()

        is_h264 = video_codec == 'h264'
        is_high_or_baseline = 'high' in profile or 'baseline' in profile or 'main' in profile
        is_baseline_only = 'baseline' in profile

        if is_h264 and is_high_or_baseline:
            needs_transcode = False
            return True, f"h264 {profile}", False

        if is_h264:
            return False, f"h264 {profile} (unsupported)", True

        return False, f"{video_codec} (unsupported)", True

    except subprocess.TimeoutExpired:
        return False, "ffprobe timeout", True
    except Exception as e:
        print(f"[WARN] ffprobe error: {e}")
        return False, str(e), True


def _transcode_video(video_path: str, output_path: str) -> bool:
    """
    使用 ffmpeg 将视频转码为网页兼容格式。
    H.264 High/Baseline Profile + AAC + moov 前置
    """
    try:
        cmd = [
            'ffmpeg', '-y', '-i', video_path,
            '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'fast',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart',
            '-max_muxing_queue_size', '9999',
            output_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300
        )

        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            print(f"[INFO] Transcoded successfully: {video_path} -> {output_path}")
            return True

        print(f"[ERROR] Transcode failed: {result.stderr[-500:]}")
        return False

    except subprocess.TimeoutExpired:
        print(f"[ERROR] Transcode timeout: {video_path}")
        return False
    except Exception as e:
        print(f"[ERROR] Transcode exception: {e}")
        return False


@video_stream_bp.route('/<path:video_path>')
def serve_video(video_path):
    """
    提供视频文件访问（支持实时转码）
    GET /api/video/<path>
    查询参数:
        - transcode=1 强制转码
        - check=1     仅检查兼容性，返回 JSON
    """
    try:
        check_only = request.args.get('check') == '1'
        force_transcode = request.args.get('transcode') == '1'

        safe_video_path = _normalize_video_path(video_path)
        full_path = os.path.abspath(os.path.join(BACKEND_DIR, safe_video_path))

        print(f"[DEBUG] Requested video: {video_path}")
        print(f"[DEBUG] Normalized path: {safe_video_path}")
        print(f"[DEBUG] Full path: {full_path}")
        print(f"[DEBUG] File exists: {os.path.exists(full_path)}")

        if not full_path.startswith(BACKEND_DIR + os.sep) and full_path != BACKEND_DIR:
            abort(403, description="Access denied")

        if not os.path.exists(full_path):
            abort(404, description=f"Video not found: {safe_video_path}")

        if not os.path.isfile(full_path):
            abort(400, description="Not a file")

        if check_only:
            is_compat, codec_info, needs_tc = _check_video_compatible(full_path)
            return {
                'compatible': is_compat,
                'codec': codec_info,
                'needs_transcode': needs_tc,
                'path': video_path
            }

        cache_key = safe_video_path

        if cache_key in transcoded_cache:
            tc_path, tc_time = transcoded_cache[cache_key]
            if os.path.exists(tc_path):
                print(f"[CACHE] Using cached transcoded: {tc_path}")
                return send_file(tc_path, mimetype='video/mp4')
            else:
                del transcoded_cache[cache_key]

        is_compat, codec_info, needs_tc = _check_video_compatible(full_path)
        print(f"[INFO] Video compatibility: {is_compat}, codec: {codec_info}, needs_transcode: {needs_tc}")

        if is_compat and not force_transcode:
            return send_file(full_path, mimetype='video/mp4')

        if not needs_tc and not force_transcode:
            return send_file(full_path, mimetype='video/mp4')

        print(f"[INFO] Starting transcode for: {video_path}")

        tc_filename = f"{uuid.uuid4().hex}.mp4"
        tc_dir = os.path.join(BACKEND_DIR, 'temp', 'transcoded')
        os.makedirs(tc_dir, exist_ok=True)
        tc_path = os.path.join(tc_dir, tc_filename)

        success = _transcode_video(full_path, tc_path)

        if success and os.path.exists(tc_path):
            if len(transcoded_cache) >= MAX_CACHE_SIZE:
                oldest = min(transcoded_cache.items(), key=lambda x: x[1][1])
                old_path = oldest[1][0]
                del transcoded_cache[oldest[0]]
                try:
                    if os.path.exists(old_path):
                        os.remove(old_path)
                except:
                    pass

            transcoded_cache[cache_key] = (tc_path, os.path.getmtime(tc_path))

            return send_file(tc_path, mimetype='video/mp4')
        else:
            abort(500, description="Video transcoding failed")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error serving video: {e}")
        abort(500, description=f"Internal server error: {str(e)}")
