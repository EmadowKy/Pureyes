#!/usr/bin/env python3
"""
数据迁移脚本：将数据库中的绝对路径转换为相对路径
使用方法：python migrate_video_paths.py
"""

import os
import sys

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.core.db import db
from app.video.views import Video

def migrate_video_paths():
    """将所有视频的绝对路径转换为相对路径"""
    app = create_app()
    
    with app.app_context():
        # 获取所有视频
        videos = Video.query.all()
        
        print(f"找到 {len(videos)} 个视频")
        
        if len(videos) == 0:
            print("没有视频需要迁移")
            return
        
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        updated_count = 0
        
        for video in videos:
            old_path = video.video_path
            
            # 检查是否已经是相对路径
            if old_path.startswith('uploads/'):
                print(f"[SKIP] {video.video_id}: 已是相对路径 - {old_path}")
                continue
            
            # 检查是否是绝对路径
            if os.path.isabs(old_path):
                # 尝试提取相对路径部分
                if 'uploads' in old_path:
                    # 提取 uploads/xxx.mp4 部分
                    idx = old_path.find('uploads/')
                    if idx != -1:
                        relative_path = old_path[idx:]
                        video.video_path = relative_path
                        print(f"[UPDATE] {video.video_id}: {old_path} -> {relative_path}")
                        updated_count += 1
                    else:
                        print(f"[ERROR] {video.video_id}: 无法提取相对路径 - {old_path}")
                else:
                    # 尝试提取文件名，放到uploads下
                    filename = os.path.basename(old_path)
                    relative_path = f"uploads/{filename}"
                    video.video_path = relative_path
                    print(f"[UPDATE] {video.video_id}: {old_path} -> {relative_path}")
                    updated_count += 1
            else:
                # 既不是绝对路径也不是以uploads开头的相对路径
                print(f"[WARN] {video.video_id}: 路径格式未知 - {old_path}")
        
        # 提交更改
        if updated_count > 0:
            try:
                db.session.commit()
                print(f"\n✅ 成功更新 {updated_count} 个视频的路径")
            except Exception as e:
                db.session.rollback()
                print(f"\n❌ 更新失败: {str(e)}")
                return False
        else:
            print("\n✅ 没有路径需要更新")
        
        return True

if __name__ == '__main__':
    print("=" * 60)
    print("视频路径迁移脚本 - 将绝对路径转换为相对路径")
    print("=" * 60)
    
    success = migrate_video_paths()
    
    if success:
        print("\n迁移完成！重启应用以应用更改。")
    else:
        print("\n迁移失败！请检查错误信息。")
        sys.exit(1)
