<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>问答详情</h2>
        <button @click="$emit('close')" class="btn-close">×</button>
      </div>

      <div v-if="!record" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else class="dialog-body">
        <!-- 基本信息 -->
        <div class="info-section">
          <div class="info-row">
            <span class="info-label">时间：</span>
            <span class="info-value">{{ formatTime(record.timestamp) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">状态：</span>
            <span 
              class="status-tag" 
              :class="record.success ? 'status-success' : 'status-failure'"
            >
              {{ record.success ? '成功' : '失败' }}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">记录 ID：</span>
            <span class="info-value monospace">{{ record.record_id }}</span>
          </div>
        </div>

        <!-- 问题 -->
        <div class="content-section">
          <div class="section-title">问题</div>
          <div class="question-box">{{ record.question }}</div>
        </div>

        <!-- 回答 -->
        <div class="content-section">
          <div class="section-title">回答</div>
          <div class="answer-box" :class="{ 'answer-error': !record.success }">
            <div v-if="record.success" class="answer-content">
              {{ record.model_result?.answer || '无回答' }}
            </div>
            <div v-else class="answer-error-message">
              <span class="error-icon">
                <i class="ri-alert-line"></i>
              </span>
              <span>{{ record.model_result?.error || '回答失败' }}</span>
            </div>
          </div>
        </div>

        <!-- 视频列表 -->
        <div class="content-section">
          <div class="section-title">涉及视频 ({{ record.video_paths?.length || 0 }})</div>
          <div class="video-list">
            <div 
              v-for="(videoPath, index) in record.video_paths" 
              :key="index" 
              class="video-item"
            >
              <span class="video-index">{{ index + 1 }}</span>
              <span class="video-path-text">{{ videoPath }}</span>
            </div>
          </div>
        </div>

        <!-- 模型结果详情（如果有） -->
        <div v-if="record.model_result && record.success" class="content-section">
          <div class="section-title">模型详情</div>
          <div class="model-details">
            <div v-if="record.model_result.success !== undefined" class="detail-row">
              <span class="detail-label">执行成功:</span>
              <span :class="record.model_result.success ? 'text-success' : 'text-error'">
                {{ record.model_result.success ? '是' : '否' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 分析过程可视化 -->
        <div v-if="record.model_result?.process_logs" class="content-section process-section">
          <ProcessFlow :process-logs="record.model_result.process_logs" />
        </div>
      </div>

      <div class="dialog-footer">
        <button @click="$emit('close')" class="btn-close-dialog">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import ProcessFlow from './ProcessFlow.vue'

const props = defineProps({
  record: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return '未知时间'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
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
  max-width: 900px;
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
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
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

.btn-close:hover {
  background: #f5f5f5;
  color: #333;
}

.loading-state {
  padding: 80px 20px;
  text-align: center;
  color: #999;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.dialog-body {
  padding: 24px;
}

/* 信息区域 */
.info-section {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #666;
  min-width: 80px;
}

.info-value {
  color: #333;
}

.monospace {
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 12px;
}

.status-tag {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-success {
  background: #f6ffed;
  color: #52c41a;
}

.status-failure {
  background: #fff2f0;
  color: #ff4d4f;
}

/* 内容区域 */
.content-section {
  margin-bottom: 24px;
}

.section-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  font-size: 15px;
}

.question-box {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 8px;
  padding: 16px;
  color: #0050b3;
  line-height: 1.6;
  font-size: 14px;
}

.answer-box {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  padding: 16px;
  line-height: 1.8;
  font-size: 14px;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

.answer-error {
  background: #fff2f0;
  border-color: #ffccc7;
}

.answer-content {
  color: #333;
}

.answer-error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ff4d4f;
}

.error-icon {
  font-size: 18px;
}

/* 视频列表 */
.video-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.video-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
}

.video-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #1890ff;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.video-path-text {
  color: #666;
  font-size: 13px;
  word-break: break-all;
  font-family: 'Fira Code', 'Courier New', monospace;
}

/* 模型详情 */
.model-details {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
}

.detail-row {
  display: flex;
  gap: 12px;
  font-size: 14px;
  margin-bottom: 8px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  color: #666;
}

.text-success {
  color: #52c41a;
  font-weight: 500;
}

.text-error {
  color: #ff4d4f;
  font-weight: 500;
}

/* 底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: center;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
  position: sticky;
  bottom: 0;
}

.btn-close-dialog {
  padding: 10px 32px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-close-dialog:hover {
  border-color: #999;
  color: #333;
}

/* 分析过程部分 */
.process-section {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 20px;
  margin-top: 24px;
}
</style>
