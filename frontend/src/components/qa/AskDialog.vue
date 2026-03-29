<template>
  <div class="dialog-overlay" @click.self="!submitting && $emit('close')">
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>{{ submitting ? 'AI 正在分析中...' : '新建问答' }}</h2>
        <button 
          @click="$emit('close')" 
          class="btn-close" 
          :disabled="submitting"
          :class="{ 'btn-close-disabled': submitting }"
        >
          ×
        </button>
      </div>

      <!-- 等待状态 -->
      <div v-if="submitting" class="processing-state">
        <div class="processing-animation">
          <div class="pulse-ring"></div>
          <div class="ai-icon">
            <i class="ri-robot-line"></i>
          </div>
        </div>
        <h3>AI 正在分析视频内容</h3>
        <p class="processing-hint">这可能需要 1-3 分钟，请耐心等待...</p>
        <div class="processing-tips">
          <div class="tip-item">
            <i class="ri-timer-line"></i> 复杂问题需要更长时间
          </div>
          <div class="tip-item">
            <i class="ri-save-line"></i> 结果将自动保存
          </div>
          <div class="tip-item">
            <i class="ri-refresh-line"></i> 请勿关闭l页面
          </div>
        </div>
      </div>

      <!-- 表单状态 -->
      <div v-else class="dialog-body">
        <!-- 问题输入 -->
        <div class="form-group">
          <label class="form-label">
            问题 <span class="required">*</span>
          </label>
          <textarea
            v-model="formData.question"
            placeholder="请输入您的问题，例如：这个视频中发生了什么？这两个视频有什么区别？"
            rows="4"
            class="form-textarea"
            :disabled="submitting"
          ></textarea>
          <div class="char-count">{{ formData.question.length }} / 500</div>
        </div>

        <!-- 视频选择 -->
        <div class="form-group">
          <label class="form-label">
            选择视频 <span class="required">*</span>
          </label>
          <div class="video-selector">
            <div v-if="loading" class="loading-videos">
              <p>加载视频中...</p>
            </div>
            <div v-else-if="availableVideos.length === 0" class="no-videos">
              <p>暂无可用视频</p>
              <p class="hint">请先上传视频</p>
            </div>
            <div v-else class="video-list">
              <label 
                v-for="video in availableVideos" 
                :key="video.video_id" 
                class="video-item"
              >
                <input
                  type="checkbox"
                  :value="video.video_path"
                  v-model="formData.video_paths"
                  :disabled="submitting"
                />
                <div class="video-info">
                  <span class="video-name">{{ video.video_name }}</span>
                  <span class="video-path">{{ video.upload_time }}</span>
                </div>
              </label>
            </div>
          </div>
          <div v-if="selectedCount > 0" class="selected-count">
            已选择 {{ selectedCount }} 个视频
          </div>
        </div>

        <!-- 提示信息 -->
        <div class="tips-box">
          <div class="tips-title">
            <i class="ri-lightbulb-line"></i> 提问小贴士
          </div>
          <ul class="tips-list">
            <li>问题描述越清晰，回答越准确</li>
            <li>可以选择多个视频进行联合分析</li>
            <li>复杂问题可能需要较长处理时间（1-3 分钟）</li>
          </ul>
        </div>
      </div>

      <div v-if="!submitting" class="dialog-footer">
        <button @click="$emit('close')" class="btn-cancel">
          取消
        </button>
        <button @click="handleSubmit" class="btn-submit" :disabled="!canSubmit">
          提交
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { videoApi } from '../../api/video'
import { ElMessage } from 'element-plus'

const props = defineProps({
  submitting: {
    type: Boolean,
    default: false
  },
  preselectedVideos: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'submit'])

// 表单数据
const formData = ref({
  question: '',
  video_paths: []
})

// 状态
const availableVideos = ref([])
const loading = ref(false)

// 计算属性
const selectedCount = computed(() => formData.value.video_paths.length)
const canSubmit = computed(() => {
  return formData.value.question.trim() && 
         formData.value.question.length <= 500 &&
         formData.value.video_paths.length > 0
})

// 加载可用视频列表
onMounted(async () => {
  await loadVideos()
  
  // 如果有预选择的视频，使用预选择的视频
  if (props.preselectedVideos && props.preselectedVideos.length > 0) {
    formData.value.video_paths = [...props.preselectedVideos]
  }
})

async function loadVideos() {
  loading.value = true
  try {
    const response = await videoApi.getVideoList()
    if (response.code === 0 && response.data) {
      availableVideos.value = response.data.videos
      
      // 默认勾选第一个视频（如果没有预选择）
      if (availableVideos.value.length > 0 && (!props.preselectedVideos || props.preselectedVideos.length === 0)) {
        formData.value.video_paths = [availableVideos.value[0].video_path]
      }
    }
  } catch (error) {
    console.error('加载视频列表失败:', error)
    ElMessage.error('加载视频列表失败')
  } finally {
    loading.value = false
  }
}

// 提交表单
function handleSubmit() {
  if (!canSubmit.value) return
  
  emit('submit', {
    question: formData.value.question.trim(),
    video_paths: [...formData.value.video_paths]
  })
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog-container {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.dialog-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}

.btn-close:hover:not(:disabled) {
  background: #f5f5f5;
  color: #333;
}

.btn-close:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.dialog-body {
  padding: 24px;
}

/* 等待状态样式 */
.processing-state {
  padding: 60px 40px;
  text-align: center;
}

.processing-animation {
  position: relative;
  display: inline-block;
  margin-bottom: 30px;
}

.pulse-ring {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  animation: pulse 1.5s ease-in-out infinite;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.ai-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translate(-50%, -50%) translateY(0);
  }
  50% {
    transform: translate(-50%, -50%) translateY(-10px);
  }
}

.processing-state h3 {
  margin: 0 0 12px 0;
  font-size: 22px;
  color: #333;
}

.processing-hint {
  color: #666;
  font-size: 15px;
  margin-bottom: 24px;
}

.processing-tips {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-top: 20px;
}

.tip-item {
  font-size: 14px;
  color: #555;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.required {
  color: #ff4d4f;
  margin-left: 4px;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.3s;
}

.form-textarea:focus {
  border-color: #1890ff;
  outline: none;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 视频选择器 */
.video-selector {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.no-videos,
.loading-videos {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}

.loading-videos {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.hint {
  font-size: 13px;
  margin-top: 8px;
  color: #bbb;
}

.video-list {
  padding: 8px;
}

.video-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.video-item:hover {
  background: #f5f5f5;
}

.video-item input[type="checkbox"] {
  margin-top: 4px;
  cursor: pointer;
}

.video-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-name {
  font-weight: 500;
  color: #333;
}

.video-path {
  font-size: 12px;
  color: #999;
  word-break: break-all;
  font-family: 'Fira Code', 'Courier New', monospace;
}

.selected-count {
  margin-top: 8px;
  font-size: 13px;
  color: #1890ff;
  font-weight: 500;
}

.example-hint {
  margin-top: 12px;
  padding: 10px 14px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  font-size: 13px;
  color: #d46b08;
}

.example-hint code {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Fira Code', 'Courier New', monospace;
}

/* 提示框 */
.tips-box {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 6px;
  padding: 16px;
}

.tips-title {
  font-weight: 500;
  color: #0050b3;
  margin-bottom: 8px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  color: #0050b3;
  font-size: 13px;
  line-height: 1.8;
}

/* 底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.btn-cancel,
.btn-submit {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  border: 1px solid #d9d9d9;
  background: white;
  color: #666;
}

.btn-cancel:hover:not(:disabled) {
  border-color: #999;
  color: #333;
}

.btn-submit {
  border: none;
  background: #1890ff;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background: #40a9ff;
}

.btn-cancel:disabled,
.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
