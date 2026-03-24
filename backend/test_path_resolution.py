#!/usr/bin/env python3
"""
测试视频路径处理 - 验证相对路径在不同环境下的兼容性
"""

import os
import sys

# 添加backend目录到路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

def test_path_resolution():
    """测试路径解析功能"""
    print("=" * 60)
    print("测试视频路径处理")
    print("=" * 60)
    
    # 测试相对路径
    test_paths = [
        'example/1.mp4',
        'example/2.mp4',
    ]
    
    # 获取backend目录
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"\nBackend目录: {backend_dir}")
    
    for rel_path in test_paths:
        full_path = os.path.join(backend_dir, rel_path)
        exists = os.path.exists(full_path)
        
        print(f"\n相对路径: {rel_path}")
        print(f"完整路径: {full_path}")
        print(f"文件存在: {'✅ 是' if exists else '❌ 否'}")
        
        if exists:
            file_size = os.path.getsize(full_path)
            print(f"文件大小: {file_size / (1024*1024):.2f} MB")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    test_path_resolution()
