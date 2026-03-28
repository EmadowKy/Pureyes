<template>
  <div class="realtime-process-flow">
    <!-- Timeline 标题和汇总 -->
    <div class="timeline-header">
      <h3 class="timeline-title">分析过程 (实时)</h3>
      <div class="timeline-summary">
        <span class="summary-item">
          <span class="summary-label">状态：</span>
          <span class="summary-value" :class="streamStatus">
            <span v-if="streamStatus === 'connected'" class="dot pulse"></span>
            {{ statusText }}
          </span>
        </span>
        <span class="summary-item">
          <span class="summary-label">经过：</span>
          <span class="summary-value">{{ elapsedTime }}s</span>
        </span>
        <span class="summary-item">
          <span class="summary-label">步数：</span>
          <span class="summary-value">{{ progressItems.length }}</span>
        </span>
      </div>
    </div>

    <!-- Timeline 主体 -->
    <div class="timeline" ref="timelineContainer">
      <!-- 初始化阶段 -->
      <div class="timeline-stage">
        <div class="stage-header" @click="toggleStage('init')">
          <div class="stage-icon initialization">⚙️</div>
          <div class="stage-content">
            <div class="stage-title">初始化阶段</div>
            <div class="stage-subtitle">模型初始化与初始采样</div>
          </div>
          <div class="stage-toggle">
            <span class="toggle-icon">{{ expandedStages.init ? '▼' : '▶' }}</span>
          </div>
        </div>
        
        <div class="stage-body" v-if="expandedStages.init">
          <div class="logs-group">
            <template v-if="initPhase.length > 0">
              <div class="log-item" v-for="(item, idx) in initPhase" :key="'init-' + idx">
                <div class="log-timestamp">{{ formatTime(item.timestamp) }}</div>
                <div class="log-badge" :class="item.status">{{ item.status }}</div>
                <div class="log-message">{{ item.message }}</div>
                <div class="log-data" v-if="Object.keys(item.data).length > 0">
                  <span v-for="(val, key) in item.data" :key="key" class="data-tag">
                    {{ key }}: {{ formatVal(val) }}
                  </span>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
            </template>
          </div>
        </div>
      </div>

      <!-- 迭代阶段 -->
      <div class="timeline-stage">
        <div class="stage-header" @click="toggleStage('iter')">
          <div class="stage-icon iteration">🔄</div>
          <div class="stage-content">
            <div class="stage-title">主循环 ({{ currentIterationCount }} 次迭代)</div>
            <div class="stage-subtitle">智能采样与评分循环</div>
          </div>
          <div class="stage-toggle">
            <span class="toggle-icon">{{ expandedStages.iter ? '▼' : '▶' }}</span>
          </div>
        </div>

        <div class="stage-body" v-if="expandedStages.iter">
          <!-- 迭代列表 -->
          <div class="iteration-list">
            <template v-if="groupedIterations.length > 0">
              <div 
                class="iteration-item" 
                v-for="(iterNum, idx) in groupedIterations"
                :key="'iter-' + idx"
              >
                <div class="iteration-header" @click="toggleIteration(idx)">
                  <div class="iteration-number">{{ iterNum }}</div>
                  <div class="iteration-info">
                    <!-- 如果有完整的迭代数据，显示详细信息；否则显示"进行中..." -->
                    <template v-if="getIterationData(iterNum)">
                      <span class="info-item">
                        选中视频: <strong>{{ getIterationData(iterNum).selected_video }}</strong>
                      </span>
                      <span class="info-item" v-if="getIterationData(iterNum).action">
                        采样位置: <strong>{{ getIterationData(iterNum).action.target_start.toFixed(1) }}s - {{ getIterationData(iterNum).action.target_end.toFixed(1) }}s</strong>
                      </span>
                    </template>
                    <template v-else>
                      <span class="info-item">进行中...</span>
                    </template>
                  </div>
                  <div class="iteration-toggle">
                    <span class="toggle-icon">{{ expandedIterations[idx] ? '▼' : '▶' }}</span>
                  </div>
                </div>

                <!-- 迭代详情 -->
                <div class="iteration-details" v-if="expandedIterations[idx]">
                  <!-- 条件渲染卡片 - 只在有数据时显示 -->
                  <div class="iteration-card" v-if="getIterationData(iterNum)">
                    <!-- 工具决策 section - 只在有 action 数据时显示 -->
                    <div class="iteration-section" v-if="getIterationData(iterNum)?.action">
                      <div class="section-label">🎯 工具决策</div>
                      <div class="section-content">
                        <div class="param-row">
                          <span class="param-name">采样选项:</span>
                          <span class="param-value">{{ getIterationData(iterNum).action.option }}</span>
                        </div>
                        <div class="param-row" v-if="getIterationData(iterNum)?.priority_before">
                          <span class="param-name">迭代前优先级:</span>
                          <span class="param-value">{{ getIterationData(iterNum).priority_before.toFixed(2) }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- 分数变化 section - 只在有 new_score 时显示 -->
                    <div class="iteration-section" v-if="getIterationData(iterNum)?.new_score !== null && getIterationData(iterNum)?.new_score !== undefined">
                      <div class="section-label">📊 分数变化</div>
                      <div class="section-content">
                        <div class="score-change">
                          <div class="score-item">
                            <span class="score-label">迭代前分数:</span>
                            <span class="score-value old">{{ getIterationData(iterNum).old_score?.toFixed(2) }}</span>
                          </div>
                          <div class="score-arrow">→</div>
                          <div class="score-item">
                            <span class="score-label">迭代后分数:</span>
                            <span class="score-value new">{{ getIterationData(iterNum).new_score?.toFixed(2) }}</span>
                          </div>
                        </div>
                        <div class="acceleration-info">
                          <span class="accel-label">加速度:</span>
                          <span class="accel-value" :class="{ positive: getIterationData(iterNum).acceleration > 0, neutral: getIterationData(iterNum).acceleration === 0 }">
                            {{ (getIterationData(iterNum).acceleration || 0).toFixed(2) }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- 新增描述 section - 只在有内容时显示 -->
                    <div class="iteration-section" v-if="getIterationData(iterNum)?.new_description_part">
                      <div class="section-label">📝 新增描述</div>
                      <div class="description-box">{{ getIterationData(iterNum).new_description_part }}</div>
                    </div>

                    <!-- 完整描述 section - 只在有内容时显示 -->
                    <div class="iteration-section" v-if="getIterationData(iterNum)?.full_description">
                      <div class="section-label">📋 完整描述</div>
                      <div class="description-box full">{{ getIterationData(iterNum).full_description }}</div>
                    </div>

                    <!-- 终止状态 section - 只在有数据时显示 -->
                    <div class="iteration-section" v-if="getIterationData(iterNum)?.video_terminated !== undefined && getIterationData(iterNum)?.video_terminated !== null">
                      <div class="section-label">🛑 状态标志</div>
                      <div class="section-content">
                        <div class="status-flag" :class="{ terminated: getIterationData(iterNum).video_terminated }">
                          <span v-if="getIterationData(iterNum).video_terminated" class="flag-icon">●</span>
                          <span v-else class="flag-icon">○</span>
                          <span class="flag-text">视频 {{ getIterationData(iterNum).video_terminated ? '已' : '未' }}终止</span>
                        </div>
                        <div class="status-flag" v-if="getIterationData(iterNum)?.global_terminated !== undefined" :class="{ terminated: getIterationData(iterNum).global_terminated }">
                          <span v-if="getIterationData(iterNum).global_terminated" class="flag-icon">●</span>
                          <span v-else class="flag-icon">○</span>
                          <span class="flag-text">全局 {{ getIterationData(iterNum).global_terminated ? '已' : '未' }}终止</span>
                        </div>
                      </div>
                    </div>

                    <!-- 处理步骤 section - 只在有日志时显示 -->
                    <div class="iteration-section" v-if="iterationGroupedLogs[iterNum] && iterationGroupedLogs[iterNum].length > 0">
                      <div class="section-label">📌 处理步骤</div>
                      <div class="logs-group">
                        <div class="log-item" v-for="(log, lidx) in iterationGroupedLogs[iterNum]" :key="'iter-log-' + lidx">
                          <div class="log-timestamp">{{ formatTime(log.timestamp) }}</div>
                          <div class="log-badge" :class="log.status">{{ log.status }}</div>
                          <div class="log-message">{{ log.message }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="iteration-item">
                <div class="iteration-header">
                  <div class="iteration-number">1</div>
                  <div class="iteration-info">
                    <span class="info-item">等待数据...</span>
                  </div>
                </div>
                <div class="iteration-details-empty">
                  <div class="logs-group">
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 最终化阶段 -->
      <div class="timeline-stage">
        <div class="stage-header" @click="toggleStage('final')">
          <div class="stage-icon finalization">✓</div>
          <div class="stage-content">
            <div class="stage-title">最终化阶段</div>
            <div class="stage-subtitle">生成最终答案</div>
          </div>
          <div class="stage-toggle">
            <span class="toggle-icon">{{ expandedStages.final ? '▼' : '▶' }}</span>
          </div>
        </div>

        <div class="stage-body" v-if="expandedStages.final">
          <div class="logs-group">
            <template v-if="finalizationPhase.length > 0">
              <div class="log-item" v-for="(item, idx) in finalizationPhase" :key="'final-' + idx">
                <div class="log-timestamp">{{ formatTime(item.timestamp) }}</div>
                <div class="log-badge" :class="item.status">{{ item.status }}</div>
                <div class="log-message">{{ item.message }}</div>
              </div>
            </template>
            <template v-else>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

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
const expandedStages = ref({ init: true, iter: true, final: true })
const expandedIterations = ref({})
const timelineContainer = ref(null)
const iterationDataMap = ref({})  // 存储完整的迭代对象数据
let eventSource = null
let elapsedTimer = null

const statusText = computed(() => {
  const texts = {
    'connecting': '连接中...',
    'connected': '实时推送中',
    'completed': '已完成',
    'failed': '失败'
  }
  return texts[streamStatus.value] || streamStatus.value
})

// 计算当前迭代数
const currentIterationCount = computed(() => {
  const iterNums = new Set()
  progressItems.value.forEach(item => {
    if (item.data?.iteration) {
      iterNums.add(item.data.iteration)
    }
  })
  return Math.max(...Array.from(iterNums), 0)
})

// 生成迭代号列表
const groupedIterations = computed(() => {
  const result = []
  for (let i = 1; i <= currentIterationCount.value; i++) {
    result.push(i)
  }
  return result
})

// 按迭代号分组日志
const iterationGroupedLogs = computed(() => {
  const logs = {}
  progressItems.value.forEach(item => {
    if (item.data?.iteration) {
      const iterNum = item.data.iteration
      if (!logs[iterNum]) logs[iterNum] = []
      logs[iterNum].push(item)
    }
  })
  return logs
})

const initPhase = computed(() => {
  return progressItems.value.filter(item => 
    ['model_initialization', 'sampling', 'description_scoring'].includes(item.stage) &&
    !item.data?.iteration
  )
})

const finalizationPhase = computed(() => {
  return progressItems.value.filter(item => 
    ['finalization', 'answering'].includes(item.stage)
  )
})

// 获取每个迭代的完整数据（如果有的话）
function getIterationData(iterNum) {
  return iterationDataMap.value[iterNum] || null
}

// 监听 progressItems 变化，自动滚动到最新
watch(() => progressItems.value.length, () => {
  scrollToBottom()
})

// 监听迭代变化，自动展开新迭代
watch(() => groupedIterations.value, (newIters) => {
  newIters.forEach(iterNum => {
    if (expandedIterations.value[iterNum - 1] === undefined) {
      expandedIterations.value[iterNum - 1] = true
    }
  })
})

function toggleStage(stage) {
  expandedStages.value[stage] = !expandedStages.value[stage]
}

function toggleIteration(idx) {
  if (expandedIterations.value[idx] === undefined) {
    expandedIterations.value[idx] = true
  } else {
    expandedIterations.value[idx] = !expandedIterations.value[idx]
  }
}

function formatTime(timestamp) {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatVal(val) {
  if (typeof val === 'number') return val % 1 === 0 ? val : val.toFixed(2)
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return `[${val.length} 项]`
  if (typeof val === 'object') return JSON.stringify(val).substring(0, 50) + '...'
  return String(val)
}

function scrollToBottom() {
  nextTick(() => {
    if (timelineContainer.value) {
      const container = timelineContainer.value
      container.scrollTop = container.scrollHeight
    }
  })
}

function connectStream() {
  streamStatus.value = 'connecting'
  progressItems.value = []
  streamStartTime.value = Date.now()

  try {
    eventSource = new EventSource(`/api/qa/task/${props.taskId}/stream`, {
      withCredentials: true
    })

    eventSource.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data)
        
        if (message.type === 'connected') {
          streamStatus.value = 'connected'
        } else if (message.type === 'progress') {
          const item = message.data
          progressItems.value.push(item)
          
          // 如果消息中包含完整的迭代对象，进行深度合并（保留已有数据，更新新数据）
          if (item.data?.iteration_data && item.data?.iteration) {
            const iterNum = item.data.iteration
            const newData = item.data.iteration_data
            
            if (iterationDataMap.value[iterNum]) {
              // 深度合并：保留已有的字段，更新新的字段
              iterationDataMap.value[iterNum] = {
                ...iterationDataMap.value[iterNum],
                ...newData,
                // 确保 action 不被覆盖（如果新数据中没有 action，保留旧的）
                action: newData.action || iterationDataMap.value[iterNum].action
              }
            } else {
              // 第一次接收该迭代，直接赋值
              iterationDataMap.value[iterNum] = newData
            }
          }
          
          scrollToBottom()
        } else if (message.type === 'complete') {
          streamStatus.value = message.status
          if (eventSource) eventSource.close()
          // 最后滚动一次确保看到所有内容
          scrollToBottom()
          // 发出完成事件
          emit('complete', message.status)
        }
      } catch (e) {
        console.error('Parse SSE error:', e)
      }
    })

    eventSource.onerror = () => {
      if (eventSource?.readyState === EventSource.CLOSED) {
        streamStatus.value = 'failed'
        if (eventSource) eventSource.close()
      }
    }
  } catch (error) {
    console.error('SSE connect error:', error)
    streamStatus.value = 'failed'
  }
}

function updateElapsedTime() {
  elapsedTimer = setInterval(() => {
    elapsedTime.value = Math.floor((Date.now() - streamStartTime.value) / 1000)
  }, 100)
}

onMounted(() => {
  connectStream()
  updateElapsedTime()
})

onUnmounted(() => {
  if (eventSource) eventSource.close()
  if (elapsedTimer) clearInterval(elapsedTimer)
})
</script>

<style scoped>
.realtime-process-flow {
  width: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.timeline-header {
  padding: 16px 0 12px;
  border-bottom: 2px solid #f0f0f0;
  margin-bottom: 20px;
}

.timeline-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.timeline-summary {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.summary-label {
  color: #666;
}

.summary-value {
  color: #1890ff;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-value.connected {
  color: #52c41a;
}

.summary-value.completed {
  color: #52c41a;
}

.summary-value.failed {
  color: #ff4d4f;
}

.dot.pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.timeline {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #1890ff, #52c41a, #faad14);
}

.timeline-stage {
  margin-bottom: 24px;
}

.stage-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9f9f9;
  border-left: 4px solid #1890ff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.stage-header:hover {
  background: #f5f5f5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stage-icon {
  font-size: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  flex-shrink: 0;
}

.stage-icon.initialization {
  background: #e6f7ff;
  color: #1890ff;
}

.stage-icon.iteration {
  background: #f6ffed;
  color: #52c41a;
}

.stage-icon.finalization {
  background: #fff7e6;
  color: #faad14;
}

.stage-content {
  flex: 1;
}

.stage-title {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.stage-subtitle {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.stage-toggle {
  display: flex;
  align-items: center;
}

.toggle-icon {
  font-size: 12px;
  color: #666;
  transition: transform 0.3s;
}

.stage-body {
  padding: 16px;
  background: #fafafa;
  border-radius: 0 6px 6px 0;
  margin-top: 8px;
}

.logs-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Iteration List */
.iteration-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.iteration-item {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border-left: 4px solid #52c41a;
}

.iteration-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  transition: background 0.2s;
  background: #f9f9f9;
}

.iteration-header:hover {
  background: #f5f5f5;
}

.iteration-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #52c41a;
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}

.iteration-info {
  flex: 1;
  display: flex;
  gap: 16px;
  font-size: 13px;
  flex-wrap: wrap;
}

.info-item {
  color: #666;
}

.info-item strong {
  color: #333;
  font-weight: 600;
}

.iteration-toggle {
  display: flex;
  align-items: center;
}

.iteration-details {
  padding: 12px;
  background: #f9f9f9;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.iteration-details-empty {
  padding: 12px;
  background: #f9f9f9;
}

/* 迭代摘要框 */
.iteration-summary {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.summary-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.summary-row .label {
  color: #666;
  font-weight: 600;
  min-width: 80px;
  flex-shrink: 0;
}

.summary-row .value {
  color: #333;
  flex: 1;
  word-break: break-word;
}

.summary-row .value.description {
  color: #666;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  font-family: monospace;
  background: #f9f9f9;
  padding: 8px;
  border-radius: 4px;
  max-height: 120px;
  overflow-y: auto;
}

/* Log Item */
.log-item {
  padding: 10px;
  background: white;
  border-radius: 4px;
  border-left: 3px solid #d9d9d9;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12px;
}

.log-timestamp {
  color: #999;
  min-width: 65px;
  flex-shrink: 0;
  font-family: monospace;
}

.log-badge {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  min-width: 60px;
  text-align: center;
  flex-shrink: 0;
}

.log-badge.started {
  background: #e6f7ff;
  color: #1890ff;
}

.log-badge.completed {
  background: #f6ffed;
  color: #52c41a;
}

.log-badge.tool_decided {
  background: #fff7e6;
  color: #faad14;
}

.log-badge.failed {
  background: #fff2f0;
  color: #ff4d4f;
}

.log-message {
  flex: 1;
  color: #333;
  line-height: 1.4;
}

.log-data {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #f0f0f0;
}

.data-tag {
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 11px;
  color: #666;
}

.data-item {
  display: block;
  width: 100%;
  font-size: 12px;
  padding: 4px 0;
  color: #333;
}

.data-key {
  color: #666;
  margin-right: 6px;
}

.data-value {
  color: #333;
  font-family: monospace;
  word-break: break-all;
}

/* Skeleton Loader */
.skeleton-item {
  padding: 10px;
  background: white;
  border-radius: 4px;
  border-left: 3px solid #d9d9d9;
  margin-bottom: 8px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  height: 44px;
  overflow: hidden;
}

.skeleton-item::before {
  content: '';
  flex-shrink: 0;
  width: 65px;
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 2px;
}

.skeleton-item::after {
  content: '';
  flex: 1;
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 2px;
  margin-top: 2px;
}

/* 迭代卡片样式 - 与 ProcessFlow 中的样式一致 */
.iteration-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.iteration-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-weight: 600;
  color: #333;
  font-size: 13px;
  padding-bottom: 6px;
  border-bottom: 2px solid #f0f0f0;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 8px;
}

.param-row {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.param-row.loading {
  opacity: 0.7;
}

.param-name {
  color: #666;
  min-width: 100px;
}

.param-value {
  color: #333;
  font-weight: 600;
}

.param-value.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  color: #f0f0f0;
  border-radius: 4px;
  padding: 2px 6px;
  min-width: 60px;
  display: inline-block;
}

.score-change {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.score-item {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
}

.score-label {
  color: #666;
}

.score-value {
  font-weight: 600;
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

.score-value.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  color: #f0f0f0;
  min-width: 50px;
  display: inline-block;
}

.score-value.old {
  background: #fff2e8;
  color: #d48806;
}

.score-value.new {
  background: #f6ffed;
  color: #52c41a;
}

.score-arrow {
  font-weight: 600;
  color: #999;
}

.acceleration-info {
  display: flex;
  gap: 8px;
  font-size: 12px;
  align-items: center;
}

.accel-label {
  color: #666;
}

.accel-value {
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  background: #f0f0f0;
}

.accel-value.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  color: #f0f0f0;
  min-width: 50px;
  display: inline-block;
}

.accel-value.positive {
  background: #f6ffed;
  color: #52c41a;
}

.accel-value.neutral {
  background: #fafafa;
  color: #666;
}

.description-box {
  background: #fafafa;
  border-left: 3px solid #1890ff;
  padding: 10px 12px;
  border-radius: 3px;
  font-size: 12px;
  color: #333;
  line-height: 1.6;
}

.description-box.loading {
  color: #999;
  font-style: italic;
}

.description-box.full {
  white-space: pre-wrap;
  font-family: monospace;
  max-height: 200px;
  overflow-y: auto;
  border-left-color: #52c41a;
}

.status-flag {
  display: flex;
  gap: 6px;
  font-size: 12px;
  align-items: center;
  padding: 4px 0;
}

.flag-icon {
  font-size: 14px;
}

.status-flag.terminated .flag-icon {
  color: #ff4d4f;
}

.status-flag:not(.terminated) .flag-icon {
  color: #52c41a;
}

.flag-text {
  color: #333;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
