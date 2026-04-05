from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.core.db import db
from app.models.user import User
from app.core.response import success, fail
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
                return fail(message="权限不足", code=2001, http_status=403)
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
            "total_video_size": user.total_video_size,
            "video_count": user.video_count
        }
    )

@users_bp.put("/me")
@jwt_required()
def update_me():
    uid = get_jwt_identity()
    user = User.query.get(int(uid))
    if not user:
        return fail(message="user not found", code=2002, http_status=404)

    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if email is not None:
        email = email.strip()
        if email and User.query.filter(User.email == email, User.id != int(uid)).first():
            return fail(message="email already exists", code=2003, http_status=409)
        user.email = email or None

    if password:
        if len(password) < 6:
            return fail(message="password must be at least 6 chars", code=2004, http_status=400)
        user.set_password(password)

    db.session.commit()
    return success(message="user updated", data={
        "uid": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role
    })

@users_bp.delete("/me")
@jwt_required()
def delete_me():
    uid = get_jwt_identity()
    user = User.query.get(int(uid))
    if not user:
        return fail(message="user not found", code=2002, http_status=404)

    db.session.delete(user)
    db.session.commit()
    return success(message="user deleted")

@users_bp.get("/admin-only")
@role_required("admin")
def admin_only():
    return success(message="hello admin", data={"ok": True})

@users_bp.get("/config")
@jwt_required()
def get_user_config():
    from app.video.views import VIDEO_CONFIG
    return success(
        data={
            "max_videos_per_user": VIDEO_CONFIG.get('max_videos_per_user', 30),
            "max_storage_per_user": VIDEO_CONFIG.get('max_storage_per_user', 2147483648),
            "max_single_video_size": VIDEO_CONFIG.get('max_single_video_size', 524288000)
        }
    )
