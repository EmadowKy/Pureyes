from flask import Flask
import os
from .core.db import db
from .extensions import jwt, cors
from .core.config import Config

def create_app():
    app = Flask(__name__)
    
    app.config.from_object(Config)
    
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}, "/*": {"origins": "*"}})
    
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blacklist(jwt_header, jwt_payload):
        from app.models.blacklist import TokenBlacklist
        jti = jwt_payload["jti"]
        return TokenBlacklist.is_blacklisted(jti)
    
    from app.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    
    from app.users import users_bp
    app.register_blueprint(users_bp, url_prefix="/api/users")
    
    from app.qa.routes import qa_bp
    app.register_blueprint(qa_bp)
    
    from app.video_stream_routes import video_stream_bp
    app.register_blueprint(video_stream_bp)

    from app.video.routes import video_bp as video_manage_bp
    app.register_blueprint(video_manage_bp)
    
    @app.get("/api/health")
    def health():
        return {"code": 0, "message": "ok", "data": {"service": "backend"}}, 200
    
    with app.app_context():
        from app.models.blacklist import TokenBlacklist
        from app.video.views import Video
        db.create_all()
    
    return app