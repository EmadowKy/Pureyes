# backend/app/__init__.py
from flask import Flask
import os
from .core.db import db
from .extensions import jwt, cors
from .core.config import Config

def create_app():
    """创建Flask应用（通用相对路径版）"""
    app = Flask(__name__)
    
    # 加载配置
    app.config.from_object(Config)
    
    # 初始化扩展
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}, "/*": {"origins": "*"}})
    
    # 注册认证蓝图
    from app.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    
    # 注册用户蓝图
    from app.users import users_bp
    app.register_blueprint(users_bp, url_prefix="/api/users")
    
    # 注册 QA 问答模块路由
    from app.qa.routes import qa_bp
    app.register_blueprint(qa_bp)
    
    # 注册视频播放路由
    from app.video_routes import video_bp
    app.register_blueprint(video_bp)
    
    # 健康检查接口
    @app.get("/api/health")
    def health():
        return {"code": 0, "message": "ok", "data": {"service": "backend"}}, 200
    
    # 创建数据库表
    with app.app_context():
        db.create_all()
    
    return app