<template>
  <div class="realtime-process-flow">
    <div class="process-header">
      <h3 class="process-title">🔴 实时分析过程</h3>
      <div class="process-status">
        <span v-if="streamStatus === 'connecting'" class="status-badge connecting">
          <span class="status-dot pulse"></span>连接中...
        </span>
        <span v-else-if="streamStatus === 'connected'" class="status-badge connected">
          <span class="status-dot pulse"></span>实时推送中
        </span>
        <span v-else-if="streamStatus === 'completed'" class="status-badge completed">
          <span class="status-icon">✓</span>已完成
        </span>
        <span v-else-if="streamStatus === 'failed'" class="status-badge failed">
          <span class="status-icon">✕</span>失败
        </span>
      </div>
    </div>

    <div class="process-stats">
      <div class="stat-item">
        <span class="stat-label">已接收：</span>
        <span class="stat-value">{{ progressItems.length }} 条消息</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">运行时长：</span>
        <span class="stat-value">{{ elapsedTime }}s</span>
      </div>
    </div>

    <div class="process-timeline">
      <!-- 进度项目 -->
      <div 
        v-for="(item, idx) in progressItems" 
        :key="idx"
        class="timeline-item"
        :class="[`stage-${item.stage}`, `status-${item.status}`]"
      >
        <div class="item-icon">
          <span v-if="item.status === 'started'" class="icon-spinner">⟳</span>
          <span v-else-if="item.status === 'completed'" class="icon-check">✓</span>
          <span v-else-if="item.status === 'failed'" class="icon-error">✕</span>
          <span v-else-if="item.status === 'tool_decided'" class="icon-tool">🎯</span>
          <span v-else class="icon-info">ℹ</span>
        </div>

        <div class="item-content">
          <div class="item-header">
            <span class="item-stage">{{ formatStageName(item.stage) }}</span>
            <span class="item-status" :class="`status-${item.status}`">
              {{ formatStatusName(item.status) }}
            </span>
            <span class="item-time">{{ formatTimestamp(item.timestamp) }}</span>
          </div>

          <div class="item-message">{{ item.message }}</div>

          <!-- 数据展示 -->
          <div v-if="item.data && Object.keys(item.data).length > 0" class="item-data">
            <div v-for="(val, key) in item.data" :key="key" class="data-line">
              <span class="data-key">{{ key }}:</span>
              <span class="data-value">{{ formatDataValue(val) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 滚动提示 -->
      <div v-if="progressItems.length > 0" ref="scrollAnchor" class="scroll-anchor"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  taskId: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['complete'])

// State
const streamStatus = ref('connecting')
const progressItems = ref([])
const streamStartTime = ref(Date.now())
const elapsedTime = ref(0)
const scrollAnchor = ref(null)
let eventSource = null
let elapsedTimer = null

// 启动SSE连接
function connectStream() {
  streamStatus.value = 'connecting'
  progressItems.value = []
  streamStartTime.value = Date.now()

  try {
    // EventSource不支持headers，使用Authorization cookie或通过自定义header拦截
    // 由于Flask/浏览器限制，我们使用axios进行轮询替代，或在后端允许CORS + credentials
    eventSource = new EventSource(`/api/qa/task/${props.taskId}/stream`, {
      withCredentials: true
    })

    eventSource.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data)
        
        if (message.type === 'connected') {
          streamStatus.value = 'connected'
          console.log('SSE connected:', message.task_id)
        } else if (message.type === 'progress') {
          progressItems.value.push(message.data)
          scrollToBottom()
        } else if (message.type === 'complete') {
          streamStatus.value = message.status
          // 关闭连接
          if (eventSource) {
            eventSource.close()
          }
          console.log('Stream complete:', message.status)
          // 触发完成事件
          emit('complete', message.status)
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e, event.data)
      }
    })

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      if (eventSource.readyState === EventSource.CLOSED) {
        streamStatus.value = 'failed'
        if (eventSource) {
          eventSource.close()
        }
      }
    }
  } catch (error) {
    console.error('Failed to connect SSE:', error)
    streamStatus.value = 'failed'
  }
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (scrollAnchor.value) {
      scrollAnchor.value.scrollIntoView({ behavior: 'smooth' })
    }
  })
}

// 更新运行时长
function updateElapsedTime() {
  elapsedTimer = setInterval(() => {
    elapsedTime.value = Math.floor((Date.now() - streamStartTime.value) / 1000)
  }, 100)
}

// 格式化阶段名称
function formatStageName(stage) {
  const names = {
    'model_initialization': '模型初始化',
    'sampling': '采样',
    'description_scoring': '描述与评分',
    'iteration': '迭代循环',
    'finalization': '最终化',
    'answering': '答案生成'
  }
  return names[stage] || stage
}

// 格式化状态名称
function formatStatusName(status) {
  const names = {
    'started': '进行中',
    'completed': '已完成',
    'failed': '失败',
    'tool_decided': '决策完毕'
  }
  return names[status] || status
}

// 格式化时间戳
function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 格式化数据值
function formatDataValue(val) {
  if (typeof val === 'number') {
    return typeof val === 'number' && val % 1 !== 0 ? val.toFixed(2) : val
  }
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return `[${val.length} 项]`
  if (typeof val === 'object') {
    const keys = Object.keys(val).slice(0, 3)
    return `{${keys.join(', ')}${Object.keys(val).length > 3 ? '...' : ''}}`
  }
  return String(val)
}

// 生命周期
onMounted(() => {
  connectStream()
  updateElapsedTime()
})

onUnmounted(() => {
  if (eventSource) {
    eventSource.close()
  }
  if (elapsedTimer) {
    clearInterval(elapsedTimer)
  }
})
</script>

<style scoped>
.realtime-process-flow {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Header */
.process-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 2px solid #f0f0f0;
  background: #fafafa;
}

.process-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.process-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-badge.connecting {
  background: #e6f7ff;
  color: #1890ff;
}

.status-badge.connected {
  background: #e6ffe6;
  color: #52c41a;
}

.status-badge.completed {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge.failed {
  background: #fff2f0;
  color: #ff4d4f;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
}

.status-dot.pulse {
  animation: pulse-animation 1.5s infinite;
}

.status-icon {
  font-weight: 700;
}

@keyframes pulse-animation {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Stats */
.process-stats {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-label {
  color: #666;
}

.stat-value {
  color: #1890ff;
  font-weight: 600;
}

/* Timeline */
.process-timeline {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.timeline-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-left: 3px solid #d9d9d9;
  background: white;
  transition: all 0.2s;
}

.timeline-item:hover {
  background: #fafafa;
}

.timeline-item.status-started {
  border-left-color: #1890ff;
  background: #f0f8ff;
}

.timeline-item.status-completed {
  border-left-color: #52c41a;
}

.timeline-item.status-failed {
  border-left-color: #ff4d4f;
  background: #fff2f0;
}

.timeline-item.status-tool_decided {
  border-left-color: #faad14;
  background: #fffbe6;
}

/* Item Icon */
.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  border: 1px solid #d9d9d9;
  flex-shrink: 0;
  font-size: 14px;
}

.timeline-item.status-started .item-icon {
  background: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
}

.timeline-item.status-completed .item-icon {
  background: #f6ffed;
  border-color: #52c41a;
  color: #52c41a;
}

.timeline-item.status-failed .item-icon {
  background: #fff2f0;
  border-color: #ff4d4f;
  color: #ff4d4f;
}

.timeline-item.status-tool_decided .item-icon {
  background: #fffbe6;
  border-color: #faad14;
  color: #faad14;
}

.icon-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Item Content */
.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.item-stage {
  font-weight: 600;
  color: #333;
  font-size: 13px;
}

.item-status {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.item-status.status-started {
  background: #e6f7ff;
  color: #1890ff;
}

.item-status.status-completed {
  background: #f6ffed;
  color: #52c41a;
}

.item-status.status-failed {
  background: #fff2f0;
  color: #ff4d4f;
}

.item-status.status-tool_decided {
  background: #fffbe6;
  color: #faad14;
}

.item-time {
  color: #999;
  font-size: 12px;
  font-family: monospace;
  margin-left: auto;
}

.item-message {
  color: #333;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}

/* Data Display */
.item-data {
  margin-top: 8px;
  padding: 8px;
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
}

.data-line {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  word-break: break-word;
}

.data-key {
  color: #666;
  font-weight: 500;
  min-width: 80px;
}

.data-value {
  color: #333;
  font-family: monospace;
  flex: 1;
}

.scroll-anchor {
  height: 0;
  pointer-events: none;
}
</style>
