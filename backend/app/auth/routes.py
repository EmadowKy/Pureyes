from flask import request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity
)
from app.core.db import db
from app.models.user import User
from app.common.response import success, fail
from . import auth_bp

def _validate_register_payload(payload: dict):
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip() or None
    password = payload.get("password") or ""

    if not username:
        return False, "username is required", None
    if len(username) < 3:
        return False, "username must be at least 3 chars", None
    if len(password) < 6:
        return False, "password must be at least 6 chars", None

    return True, "ok", {"username": username, "email": email, "password": password}

@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True) or {}
    ok, msg, parsed = _validate_register_payload(payload)
    if not ok:
        return fail(message=msg, code=1001, http_status=400)

    username = parsed["username"]
    email = parsed["email"]
    password = parsed["password"]

    if User.query.filter_by(username=username).first():
        return fail(message="username already exists", code=1002, http_status=409)

    if email and User.query.filter_by(email=email).first():
        return fail(message="email already exists", code=1003, http_status=409)

    user = User(username=username, email=email, role="user")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return success(
        message="register success",
        code=200,
        data={
            "uid": user.id,
            "username": user.username,
            "role": user.role
        },
        http_status=201
    )

@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""

    if not username or not password:
        return fail(message="username and password are required", code=1101, http_status=400)

    user = User.query.filter_by(username=username).first()
    if not user:
        return fail(message="invalid username or password", code=1102, http_status=401)

    if not user.is_active:
        return fail(message="user is inactive", code=1103, http_status=403)

    if not user.check_password(password):
        return fail(message="invalid username or password", code=1102, http_status=401)

    # identity 存 uid，附加 claims 存 role
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "username": user.username}
    )
    refresh_token = create_refresh_token(identity=str(user.id))

    return success(
        message="login success",
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "uid": user.id,
                "username": user.username,
                "role": user.role
            }
        }
    )

@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    uid = get_jwt_identity()
    user = User.query.get(int(uid))
    if not user:
        return fail(message="user not found", code=1201, http_status=404)
    if not user.is_active:
        return fail(message="user is inactive", code=1202, http_status=403)

    new_access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "username": user.username}
    )
    return success(
        message="token refreshed",
        data={"access_token": new_access_token}
    )
