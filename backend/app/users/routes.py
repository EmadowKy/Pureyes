from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models.user import User
from app.common.response import success, fail
from . import users_bp

def role_required(*roles):
    def decorator(fn):
        from functools import wraps
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            current_role = claims.get("role")
            if current_role not in roles:
                return fail(message="permission denied", code=2001, http_status=403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator

@users_bp.get("/me")
@jwt_required()
def me():
    uid = get_jwt_identity()
    user = User.query.get(int(uid))
    if not user:
        return fail(message="user not found", code=2002, http_status=404)

    return success(
        data={
            "uid": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "total_video_size": user.total_video_size,  # 用户已使用的总存储（字节）
            "video_count": user.video_count  # 用户已上传的视频数
        }
    )

# 示例：管理员接口，证明"权限等级"可用
@users_bp.get("/admin-only")
@role_required("admin")
def admin_only():
    return success(message="hello admin", data={"ok": True})
