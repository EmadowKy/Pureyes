import os
import sys
import torch
import gc

current_file = os.path.abspath(__file__)
qa_dir = os.path.dirname(current_file)
project_root = os.path.dirname(qa_dir)
sys.path.append(project_root)

os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True,max_split_size_mb:512'

if torch.cuda.is_available():
    torch.cuda.empty_cache()

from typing import List, Dict, Any
from mva.agent_runner import AgentRunner

def ask_model(question: str, video_paths: List[str], config_path: str, 
                                  enable_memory_optimization: bool = True) -> Dict[str, Any]:
    """
    Analyze multiple videos based on a given question using the multi-video understanding model.
    Passes all videos to the model at once for true multi-video joint analysis and comparison.
    
    Args:
        question (str): The question to analyze.
        video_paths (List[str]): A list of paths to the video files.
        config_path (str): Path to the configuration file for the model.
        enable_memory_optimization (bool): Enable GPU memory optimization (default: True).

    Returns:
        Dict[str, Any]: The raw JSON response from the model.
    """
    print("=" * 60)
    print("开始多视频联合分析...")
    print(f"视频数量: {len(video_paths)}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"总显存: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
    print("=" * 60)
    
    agent_runner = AgentRunner(config_path=config_path, device_id=0)

    if video_paths:
        base_dir = os.path.dirname(video_paths[0])
        relative_paths = [os.path.basename(vp) for vp in video_paths]
    else:
        return {"error": "No video paths provided", "success": False}
    sample = {
        "question": question,
        "video_paths": relative_paths 
    }

    try:
        print(f"\n传入模型的视频: {relative_paths}")
        result = agent_runner.run_on_sample(sample, video_base_dir=base_dir)
        
        if result.get("success", True) is False:
            print(f"分析失败: {result.get('error', '未知错误')}")
        else:
            print(f"多视频分析完成")
        
        # Clear VRAM after processing
        if enable_memory_optimization:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
        
        return result
    except Exception as e:
        print(f"处理视频时出错: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "success": False}
    

if __name__ == "__main__":
    current_file_path = os.path.abspath(__file__)
    current_dir = os.path.dirname(current_file_path)
    question = "这两个视频有什么区别？"
    video_paths = [
        os.path.join(current_dir, "../../example/1.mp4"),
        os.path.join(current_dir, "../../example/2.mp4")
    ]
    
    config_path = os.path.join(current_dir, "../../configs/model.yaml")

    analysis_result = ask_model(
        question, 
        video_paths, 
        config_path,
        enable_memory_optimization=True
    )
    print(analysis_result)