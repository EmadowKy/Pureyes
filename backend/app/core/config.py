import os

CORE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(CORE_DIR)
BACKEND_DIR = os.path.dirname(APP_DIR)

class Config:
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BACKEND_DIR, 'user.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = "temp_key"
    VIDEO_UPLOAD_PATH = os.path.join(BACKEND_DIR, "uploads")