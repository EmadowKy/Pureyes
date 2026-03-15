# 启动说明

## 项目结构
video_ai_agent/
├── backend/  # 后端服务（Flask）
└── frontend/ # 前端页面（Vue3+Vite）

## 环境要求
- 后端：Python 3.8+
- 前端：Node.js 16+（自带npm）

## 启动步骤
### 第一步：启动后端服务（Windows）
1. 打开「命令提示符（CMD）」，进入后端目录：
   cd backend
2. 安装后端依赖：
   pip install -r requirements.txt
3. 启动后端服务：
   python run.py
4. 验证启动成功：
   控制台显示以下内容即成功（服务运行在8000端口）：
   ✅ 后端服务初始化完成
    * Running on all addresses (0.0.0.0)
    * Running on http://127.0.0.1:8000

### 第二步：启动前端服务（Windows）
#### 前置准备（未安装Node.js时执行）
1. 下载Node.js LTS版本：https://nodejs.org/zh-cn/
2. 安装Node.js（勾选「Add to PATH」）
3. 验证安装：
   node -v
   npm -v

#### 前端启动流程
1. 打开新的「命令提示符（CMD）」，进入前端目录：
   cd frontend
2. 安装前端依赖：
   npm install
3. 启动前端服务：
   npm run dev
4. 验证启动成功：
   控制台显示以下内容即成功（服务运行在5173端口）：
   VITE v5.0.10  ready in xxx ms
   ➜  Local:   http://127.0.0.1:5173/

### 第三步：访问项目
打开浏览器，访问以下地址即可查看空白前端页面：
http://127.0.0.1:5173

## 停止服务
- 后端：在启动后端的CMD窗口中，按下 Ctrl+C 后输入 y 确认停止
- 前端：在启动前端的CMD窗口中，按下 Ctrl+C 后输入 y 确认停止