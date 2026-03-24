import os

# 测试路径计算
current_file = os.path.abspath(__file__)
print(f"Current file: {current_file}")

# 向上一级：test_path.py → backend
backend_root = os.path.dirname(current_file)
print(f"Backend root: {backend_root}")

# 测试示例视频路径
example_video = os.path.join(backend_root, 'example', '1.mp4')
print(f"Example video path: {example_video}")
print(f"File exists: {os.path.exists(example_video)}")

# 模拟视频路由中的路径计算
video_routes_file = os.path.join(backend_root, 'app', 'video', 'routes.py')
print(f"\nVideo routes file: {video_routes_file}")

# 从video/routes.py计算backend根目录
test_current_file = video_routes_file
test_backend_root = os.path.dirname(os.path.dirname(os.path.dirname(test_current_file)))
print(f"Calculated backend root from video/routes.py: {test_backend_root}")

# 测试构建视频路径
test_video_path = 'example/1.mp4'
test_full_path = os.path.join(test_backend_root, test_video_path)
print(f"Calculated full video path: {test_full_path}")
print(f"File exists: {os.path.exists(test_full_path)}")
