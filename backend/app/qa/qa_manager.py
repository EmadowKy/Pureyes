"""
QA Manager Module - Handles multi-video question answering with record storage

Provides:
1. ask_question(): Run model and store result by username
2. delete_record(): Delete a specific QA record by username and record ID
3. get_user_records(): Get all QA records for a user
"""

import os
import sys
import json
import yaml
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
import shutil

# Add parent directory to path for imports
current_file = os.path.abspath(__file__)
qa_dir = os.path.dirname(current_file)
project_root = os.path.dirname(qa_dir)  # backend 目录
sys.path.append(project_root)

# 项目根目录（backend 的父目录）- 用于存储数据
base_project_root = os.path.dirname(project_root)


class QAManager:
    """Manages QA records storage and retrieval"""
    
    def __init__(self, config_path: str):
        """
        Initialize QAManager with configuration
        
        Args:
            config_path (str): Path to qa_storage.yaml configuration file
        """
        self.config_path = config_path
        self.config = self._load_config(config_path)
        self.storage_dir = self._get_storage_dir()
        self.max_records = self.config['storage'].get('max_records_per_user', 100)
        self.backup_dir = self._get_backup_dir()
        
        # Debug output
        print(f"\n{'='*60}")
        print(f"QA Manager 初始化")
        print(f"project_root: {project_root}")
        print(f"storage_dir: {self.storage_dir}")
        print(f"backup_dir: {self.backup_dir}")
        print(f"{'='*60}\n")
        
        # Create storage directories if they don't exist
        os.makedirs(self.storage_dir, exist_ok=True)
        if self.config['storage'].get('enable_backup', True):
            os.makedirs(self.backup_dir, exist_ok=True)
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load YAML configuration file"""
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found: {config_path}")
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def _get_storage_dir(self) -> str:
        """Get absolute path for storage directory"""
        storage_path = self.config['storage'].get('storage_dir', 'output/qa_records')
        
        # 如果是相对路径，相对于项目根目录（backend 的父目录）
        if not os.path.isabs(storage_path):
            storage_path = os.path.join(base_project_root, storage_path)
        
        return os.path.abspath(storage_path)
    
    def _get_backup_dir(self) -> str:
        """Get absolute path for backup directory"""
        backup_path = self.config['storage'].get('backup_dir', 'output/qa_backups')
        
        if not os.path.isabs(backup_path):
            backup_path = os.path.join(base_project_root, backup_path)
        
        return os.path.abspath(backup_path)
    
    def _get_user_dir(self, user_id: str) -> str:
        """Get directory path for a specific user by uid (string/int).

        We store QA records under `storage_dir/<uid>/` to ensure stability even if username changes.
        """
        return os.path.join(self.storage_dir, str(user_id))
    
    def _get_records_file(self, user_id: str) -> str:
        """Get path to user's records JSON file (by uid)"""
        user_dir = self._get_user_dir(user_id)
        return os.path.join(user_dir, "qa_records.json")
    
    def _load_user_records(self, user_id: str) -> List[Dict[str, Any]]:
        """Load existing records for a user (by uid)"""
        records_file = self._get_records_file(user_id)
        
        if not os.path.exists(records_file):
            return []
        
        try:
            with open(records_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Failed to load records for {username}: {e}")
            return []
    
    def _save_user_records(self, user_id: str, records: List[Dict[str, Any]]) -> None:
        """Save records for a user (by uid)"""
        user_dir = self._get_user_dir(user_id)
        os.makedirs(user_dir, exist_ok=True)
        
        records_file = self._get_records_file(user_id)
        
        # Create backup before saving if enabled
        if self.config['storage'].get('enable_backup', True) and os.path.exists(records_file):
            backup_file = os.path.join(
                self.backup_dir,
                f"{user_id}_qa_records_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
            shutil.copy2(records_file, backup_file)
        
        with open(records_file, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
    
    def save_temp_record(self, user_id: str, record: Dict[str, Any], username: Optional[str] = None) -> None:
        """
        Save a temporary processing record for a user (by uid).

        Args:
            user_id (str|int): User id (uid) used for storage path
            record (Dict): Record data with 'processing' status
            username (str, optional): Human-readable username to store inside record for display
        """
        # Load existing records
        records = self._load_user_records(user_id)
        
        # Add new record at the beginning
        # ensure record contains uid and username snapshot
        record.setdefault('uid', str(user_id))
        if username:
            record.setdefault('username', username)
        records.insert(0, record)
        
        # Enforce max records limit
        if len(records) > self.max_records:
            removed = records[self.max_records:]
            records = records[:self.max_records]
            print(f"超过最大记录数限制 ({self.max_records})，已删除 {len(removed)} 条旧记录")
        
        # Save records
        self._save_user_records(user_id, records)
    
    def update_record(self, user_id: str, record_id: str, record_data: Dict[str, Any]) -> bool:
        """
        Update an existing record
        
        Args:
            username (str): Username
            record_id (str): Record ID to update
            record_data (Dict): New record data
            
        Returns:
            bool: True if updated successfully, False if not found
        """
        records = self._load_user_records(user_id)

        # Find and update the record
        for i, rec in enumerate(records):
            if rec.get('record_id') == record_id:
                records[i] = {**rec, **record_data}
                # ensure uid remains
                records[i].setdefault('uid', str(user_id))
                self._save_user_records(user_id, records)
                return True

        return False
    
    def ask_question(self, 
                    user_id: str,
                    username: Optional[str],
                    question: str, 
                    video_paths: List[str], 
                    config_path: str,
                    enable_memory_optimization: bool = True) -> Dict[str, Any]:
        """
        Ask a question about videos and store the result
        
        Args:
            username (str): Username for record organization
            question (str): The question to ask about the videos
            video_paths (List[str]): List of absolute paths to video files
            config_path (str): Path to model configuration YAML
            enable_memory_optimization (bool): Enable GPU memory optimization
        
        Returns:
            Dict: Contains 'record_id', 'question', 'answer', 'timestamp', and other metadata
        """
        # Lazy import to avoid loading torch at module level
        from run_model import ask_model

        print(f"\n{'='*60}")
        print(f"用户 uid: {user_id} username: {username}")
        print(f"问题: {question}")
        print(f"视频数: {len(video_paths)}")
        print(f"{'='*60}")

        # Generate unique record ID
        record_id = str(uuid.uuid4())

        # Run the model
        print("运行模型分析...")
        result = ask_model(
            question=question,
            video_paths=video_paths,
            config_path=config_path,
            enable_memory_optimization=enable_memory_optimization
        )

        # Create record
        timestamp = datetime.now().isoformat()
        record = {
            "record_id": record_id,
            "uid": str(user_id),
            "username": username,
            "timestamp": timestamp,
            "question": question,
            "video_paths": video_paths,
            "model_result": result,
            "success": result.get("success", True)
        }

        # Load existing records
        records = self._load_user_records(user_id)

        # Add new record at the beginning
        records.insert(0, record)

        # Enforce max records limit
        if len(records) > self.max_records:
            removed = records[self.max_records:]
            records = records[:self.max_records]
            print(f"超过最大记录数限制 ({self.max_records})，已删除 {len(removed)} 条旧记录")

        # Save records
        self._save_user_records(user_id, records)

        print(f"记录已保存 (ID: {record_id})")

        return record
    
    def delete_record(self, user_id: str, record_id: str) -> bool:
        """
        Delete a specific QA record by username and record ID
        
        Args:
            username (str): Username who owns the record
            record_id (str): Unique ID of the record to delete
        
        Returns:
            bool: True if deletion successful, False if record not found
        """
        records = self._load_user_records(user_id)

        # Find and remove the record
        original_count = len(records)
        records = [r for r in records if r.get("record_id") != record_id]

        if len(records) == original_count:
            print(f"记录未找到 - 用户 uid: {user_id}, ID: {record_id}")
            return False

        # Save updated records
        self._save_user_records(user_id, records)
        print(f"记录已删除 - 用户 uid: {user_id}, ID: {record_id}")

        return True
    
    def get_user_records(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get all QA records for a user
        
        Args:
            username (str): Username to retrieve records for
            limit (int, optional): Limit number of records returned (most recent first)
        
        Returns:
            List[Dict]: List of QA records for the user
        """
        records = self._load_user_records(user_id)

        # Return limited results if specified
        if limit is not None:
            records = records[:limit]

        return records
    
    def get_record_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Get summary statistics about user's records
        
        Args:
            username (str): Username to get summary for
        
        Returns:
            Dict: Summary including total records, success count, latest timestamp, etc.
        """
        records = self._load_user_records(user_id)

        if not records:
            return {
                "username": None,
                "total_records": 0,
                "success_count": 0,
                "failure_count": 0,
                "processing_count": 0,
                "latest_record": None
            }
        
        # 根据 status 和 success 字段判断状态
        processing_count = sum(1 for r in records if r.get("status") == "processing" or r.get("success") is None)
        success_count = sum(1 for r in records if r.get("success") is True and r.get("status") != "processing")
        failure_count = sum(1 for r in records if r.get("success") is False or r.get("status") == "failed")
        
        return {
            "username": records[0].get('username') if records else None,
            "total_records": len(records),
            "success_count": success_count,
            "failure_count": failure_count,
            "processing_count": processing_count,
            "latest_record": records[0],
            "storage_path": self._get_user_dir(user_id)
        }
    
    def export_records(self, user_id: str, export_path: str) -> bool:
        """
        Export user's records to a specific file
        
        Args:
            username (str): Username whose records to export
            export_path (str): Absolute path to save exported records
        
        Returns:
            bool: True if export successful
        """
        records = self._load_user_records(user_id)

        try:
            os.makedirs(os.path.dirname(export_path), exist_ok=True)
            with open(export_path, 'w', encoding='utf-8') as f:
                json.dump(records, f, ensure_ascii=False, indent=2)
            print(f"记录已导出: {export_path}")
            return True
        except IOError as e:
            print(f"导出失败: {e}")
            return False


# Example usage
if __name__ == "__main__":
    # Initialize manager
    config_file = os.path.join(os.path.dirname(__file__), "../../configs/qa_storage.yaml")
    manager = QAManager(config_file)
    
    # Example: Ask a question
    # record = manager.ask_question(
    #     username="user123",
    #     question="视频中发生了什么?",
    #     video_paths=[],
    #     config_path=""
    # )
    
    # Example: Get user records
    # records = manager.get_user_records("user123", limit=10)
    # print(json.dumps(records, ensure_ascii=False, indent=2))
    
    # Example: Delete a record
    # manager.delete_record("user123", "a819db39-7356-4c68-b5dd-728f20d4eddb")
    
