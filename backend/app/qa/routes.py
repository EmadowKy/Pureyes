# backend/app/qa/routes.py
"""QA 模块的 API 路由 - 支持异步处理"""

from flask import Blueprint, request, jsonify, send_file
from .qa_manager import QAManager
from .run_model import ask_model
import os
import json
import tempfile
import time
import threading
import uuid
from datetime import datetime

qa_bp = Blueprint('qa', __name__, url_prefix='/api/qa')

# 初始化 QA 管理器
config_path = os.path.join(os.path.dirname(__file__), "../../configs/qa_storage.yaml")
qa_manager = QAManager(config_path)

# 存储正在运行的任务（内存存储，重启后清空）
# 格式：{ task_id: { "username": str, "question": str, "status": str, "created_at": datetime } }
running_tasks = {}


def get_current_user(request_data=None):
    """从请求头、请求体或查询参数获取当前用户信息"""
    username = None
    
    # 优先从请求体获取 username
    if request_data and isinstance(request_data, dict):
        username = request_data.get('username')
    
    # 其次从查询参数获取（用于 GET 请求）
    if not username:
        username = request.args.get('username')
    
    # 再从 Authorization header 获取
    if not username:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if token and token.startswith("valid_"):
            username = token.replace("valid_", "")
    
    # 最后从 X-Username header 获取
    if not username:
        username = request.headers.get('X-Username')
    
    if username:
        return username
    
    return "default_user"


def process_question_async(task_id, username, question, video_paths, config_path):
    """后台线程处理问题"""
    try:
        # 调用模型回答问题
        result = ask_model(question, video_paths, config_path)
        
        # 提取回答内容 - 优先使用 predicted_answer，其次使用 answer_generation.raw_output
        answer = result.get('predicted_answer') or \
                 (result.get('answer_generation') or {}).get('raw_output') or \
                 '无回答'
        
        # 添加 answer 字段到 model_result（方便前端读取）
        result['answer'] = answer
        
        # 创建最终记录
        final_record = {
            'record_id': task_id,
            'timestamp': datetime.now().isoformat(),
            'question': question,
            'video_paths': video_paths,
            'success': result.get('success', True),
            'model_result': result,
            'status': 'completed'  # 标记为已完成
        }
        
        # 更新记录（替换临时记录）
        qa_manager.update_record(username, task_id, final_record)
        
        # 更新任务状态
        running_tasks[task_id]['status'] = 'completed'
        running_tasks[task_id]['result'] = result
        running_tasks[task_id]['completed_at'] = datetime.now().isoformat()
        
    except Exception as e:
        # 处理失败
        error_record = {
            'success': False,
            'model_result': {
                'success': False,
                'error': str(e),
                'answer': f'处理失败：{str(e)}'
            },
            'status': 'failed'  # 标记为失败
        }
        qa_manager.update_record(username, task_id, error_record)
        
        running_tasks[task_id]['status'] = 'failed'
        running_tasks[task_id]['error'] = str(e)
        running_tasks[task_id]['completed_at'] = datetime.now().isoformat()


@qa_bp.route('/ask', methods=['POST'])
def ask():
    """
    提问接口（异步处理）
    POST /api/qa/ask
    {
        "question": "问题内容",
        "video_paths": ["视频路径 1", "视频路径 2"],
        "username": "用户名"
    }
    返回：
    {
        "code": 200,
        "msg": "已提交处理",
        "data": {
            "task_id": "任务 ID",
            "status": "processing"
        }
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"code": 400, "msg": "请求数据为空", "data": None}), 400
        
        question = data.get('question', '').strip()
        video_paths = data.get('video_paths', [])
        
        if not question:
            return jsonify({"code": 400, "msg": "问题不能为空", "data": None}), 400
        
        if not video_paths or len(video_paths) == 0:
            return jsonify({"code": 400, "msg": "请至少选择一个视频", "data": None}), 400
        
        # 获取当前用户
        username = get_current_user(data)
        
        # 生成任务 ID
        task_id = str(uuid.uuid4())
        
        # 创建"运行中"状态的记录
        temp_record = {
            'record_id': task_id,
            'timestamp': datetime.now().isoformat(),
            'question': question,
            'video_paths': video_paths,
            'success': None,  # None 表示正在处理
            'model_result': {
                'answer': 'AI 正在分析中，请稍候...',
                'status': 'processing'
            },
            'status': 'processing'
        }
        
        # 先保存一个临时记录到用户的记录中
        qa_manager.save_temp_record(username, temp_record)
        
        # 记录任务
        running_tasks[task_id] = {
            'username': username,
            'question': question,
            'video_paths': video_paths,
            'status': 'processing',
            'created_at': datetime.now().isoformat(),
            'record_id': task_id
        }
        
        # 启动后台线程处理
        config_path = os.path.join(os.path.dirname(__file__), "../../configs/model.yaml")
        thread = threading.Thread(
            target=process_question_async,
            args=(task_id, username, question, video_paths, config_path)
        )
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "code": 200,
            "msg": "问题已提交，正在处理中",
            "data": {
                "task_id": task_id,
                "status": "processing",
                "record_id": task_id
            }
        })
        
    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": f"服务器错误：{str(e)}",
            "data": None
        }), 500


@qa_bp.route('/task/<task_id>/status', methods=['GET'])
def get_task_status(task_id):
    """
    获取任务状态
    GET /api/qa/task/{task_id}/status
    """
    try:
        username = get_current_user()
        records = qa_manager.get_user_records(username)
        record = next((r for r in records if r.get('record_id') == task_id), None)
        
        if not record:
            return jsonify({
                "code": 404,
                "msg": "任务不存在",
                "data": None
            }), 404
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "status": record.get('status', 'completed'),
                "record": record
            }
        })
        
    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": f"服务器错误：{str(e)}",
            "data": None
        }), 500


@qa_bp.route('/records', methods=['GET'])
def get_records():
    """
    获取用户的问答记录列表
    GET /api/qa/records?page=1&limit=10
    """
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        
        username = get_current_user()
        
        # 直接从存储中获取所有记录（包括正在处理的记录）
        all_records = qa_manager.get_user_records(username)
        
        # 分页
        total = len(all_records)
        start = (page - 1) * limit
        end = start + limit
        records = all_records[start:end]
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "records": records,
                "total": total,
                "page": page,
                "limit": limit
            }
        })
        
    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": f"服务器错误：{str(e)}",
            "data": None
        }), 500


@qa_bp.route('/record/<record_id>', methods=['GET'])
def get_record(record_id):
    """
    获取单条问答记录详情
    GET /api/qa/record/{record_id}
    """
    try:
        username = get_current_user()
        
        # 从记录中查找
        records = qa_manager.get_user_records(username)
        record = next((r for r in records if r.get('record_id') == record_id), None)
        
        if not record:
            return jsonify({
                "code": 404,
                "msg": "记录不存在",
                "data": None
            }), 404
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": record
        })
        
    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": f"服务器错误：{str(e)}",
            "data": None
        }), 500


@qa_bp.route('/record/<record_id>', methods=['DELETE'])
def delete_record(record_id):
    """
    删除问答记录
    DELETE /api/qa/record/{record_id}
    """
    try:
        username = get_current_user()
        
        success = qa_manager.delete_record(username, record_id)
        
        if success:
            return jsonify({
                "code": 200,
                "msg": "删除成功",
                "data": None
            })
        else:
            return jsonify({
                "code": 404,
                "msg": "记录不存在或删除失败",
                "data": None
            }), 404
        
    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": f"服务器错误：{str(e)}",
            "data": None
        }), 500


@qa_bp.route('/summary', methods=['GET'])
def get_summary():
    """
    获取统计摘要
    GET /api/qa/summary
    """
    try:
        username = get_current_user()
        summary = qa_manager.get_record_summary(username)
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": summary
        })
        
    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": f"服务器错误：{str(e)}",
            "data": None
        }), 500


@qa_bp.route('/export', methods=['GET'])
def export_records():
    """
    导出问答记录
    GET /api/qa/export?format=json
    """
    try:
        format_type = request.args.get('format', 'json').lower()
        username = get_current_user()
        
        print(f"\n[DEBUG] 导出请求:")
        print(f"  用户名：{username}")
        print(f"  格式：{format_type}")
        
        # 获取所有记录
        records = qa_manager.get_user_records(username)
        
        print(f"  记录数：{len(records)}")
        
        if not records:
            return jsonify({
                "code": 404,
                "msg": "当前用户暂无可导出的记录",
                "data": None
            }), 404
        
        if format_type == 'json':
            # 创建临时 JSON 文件
            temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
            json.dump(records, temp_file, ensure_ascii=False, indent=2)
            temp_file.close()
            
            print(f"  临时文件：{temp_file.name}")
            
            return send_file(
                temp_file.name,
                mimetype='application/json',
                as_attachment=True,
                download_name=f'qa_records_{username}_{int(time.time())}.json'
            )
        else:
            return jsonify({
                "code": 400,
                "msg": f"不支持的导出格式：{format_type}",
                "data": None
            }), 400
        
    except Exception as e:
        import traceback
        print(f"\n[ERROR] 导出失败:")
        print(f"  错误：{e}")
        traceback.print_exc()
        
        return jsonify({
            "code": 500,
            "msg": f"服务器错误：{str(e)}",
            "data": None
        }), 500
