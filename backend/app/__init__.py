# backend/app/__init__.py
from flask import Flask
from flask_cors import CORS
import os

def create_app():
    """创建Flask应用（通用相对路径版）"""
    app = Flask(__name__)
    CORS(app, supports_credentials=True, resources={"/*": {"origins": "*"}})
    BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DB_PATH = os.path.join(BACKEND_DIR, "user.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = "temp_key"
    
    return app