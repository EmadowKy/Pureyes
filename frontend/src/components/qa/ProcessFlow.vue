<template>
  <div class="process-flow">
    <!-- Timeline 标题和汇总 -->
    <div class="timeline-header">
      <h3 class="timeline-title">分析过程</h3>
      <div class="timeline-summary" v-if="processLogs">
        <span class="summary-item">
          <span class="summary-label">总耗时：</span>
          <span class="summary-value">{{ totalDuration }}s</span>
        </span>
        <span class="summary-item">
          <span class="summary-label">迭代次数：</span>
          <span class="summary-value">{{ iterationCount }}</span>
        </span>
        <span class="summary-item">
          <span class="summary-label">阶段数：</span>
          <span class="summary-value">{{ uniqueStages.length }}</span>
        </span>
      </div>
    </div>

    <!-- Timeline 主体 -->
    <div class="timeline">
      <!-- 初始化阶段 -->
      <div class="timeline-stage" v-if="hasInitialization">
        <div class="stage-header" @click="toggleStage('initialization')">
          <div class="stage-icon initialization">⚙️</div>
          <div class="stage-content">
            <div class="stage-title">初始化阶段</div>
            <div class="stage-subtitle">模型初始化与初始采样</div>
          </div>
          <div class="stage-toggle">
            <span class="toggle-icon">{{ expandedStages.initialization ? '▼' : '▶' }}</span>
          </div>
        </div>
        
        <div class="stage-body" v-if="expandedStages.initialization">
          <!-- 初始化视频 -->
          <div class="init-videos" v-if="processLogs.initialization">
            <div class="init-video" v-for="(video, idx) in processLogs.initialization" :key="idx">
              <div class="video-name">{{ video.video }}</div>
              <div class="video-details">
                <div class="detail-item">
                  <span class="detail-label">初始描述:</span>
                  <span class="detail-value">{{ video.initial_description }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">初始分数:</span>
                  <span class="detail-value score">{{ video.score.toFixed(2) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">优先级:</span>
                  <span class="detail-value">{{ video.priority.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 初始化日志 -->
          <div class="logs-group">
            <div class="log-item" v-for="(log, idx) in initializationLogs" :key="'init-' + idx">
              <div class="log-timestamp">{{ formatTime(log.timestamp) }}</div>
              <div class="log-badge" :class="log.status">{{ log.status }}</div>
              <div class="log-message">{{ log.message }}</div>
              <div class="log-data" v-if="Object.keys(log.data).length > 0">
                <span v-for="(val, key) in log.data" :key="key" class="data-tag">
                  {{ key }}: {{ val }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 迭代阶段 -->
      <div class="timeline-stage" v-if="iterationLogs.length > 0">
        <div class="stage-header" @click="toggleStage('iterations')">
          <div class="stage-icon iteration">🔄</div>
          <div class="stage-content">
            <div class="stage-title">主循环 ({{ iterationCount }} 次迭代)</div>
            <div class="stage-subtitle">智能采样与评分循环</div>
          </div>
          <div class="stage-toggle">
            <span class="toggle-icon">{{ expandedStages.iterations ? '▼' : '▶' }}</span>
          </div>
        </div>

        <div class="stage-body" v-if="expandedStages.iterations">
          <!-- 每个迭代 -->
          <div class="iteration-list">
            <div 
              class="iteration-item" 
              v-for="(iter, idx) in groupedIterations"
              :key="'iter-' + idx"
            >
              <div class="iteration-header" @click="toggleIteration(idx)">
                <div class="iteration-number">{{ iter.iteration }}</div>
                <div class="iteration-info">
                  <span class="info-item">
                    选中视频: <strong>{{ iter.selected_video }}</strong>
                  </span>
                  <span class="info-item" v-if="iter.action">
                    采样位置: <strong>{{ iter.action.target_start.toFixed(1) }}s - {{ iter.action.target_end.toFixed(1) }}s</strong>
                  </span>
                </div>
                <div class="iteration-toggle">
                  <span class="toggle-icon">{{ expandedIterations[idx] ? '▼' : '▶' }}</span>
                </div>
              </div>

              <!-- 迭代详情 -->
              <div class="iteration-details" v-if="expandedIterations[idx]">
                <!-- 决策信息 -->
                <div class="iteration-section">
                  <div class="section-label">🎯 工具决策</div>
                  <div class="section-content">
                    <div class="param-row" v-if="iter.action">
                      <span class="param-name">采样选项:</span>
                      <span class="param-value">{{ iter.action.option }}</span>
                    </div>
                    <div class="param-row" v-if="iter.priority_before">
                      <span class="param-name">迭代前优先级:</span>
                      <span class="param-value">{{ iter.priority_before.toFixed(2) }}</span>
                    </div>
                  </div>
                </div>

                <!-- 分数变化 -->
                <div class="iteration-section">
                  <div class="section-label">📊 分数变化</div>
                  <div class="section-content">
                    <div class="score-change">
                      <div class="score-item">
                        <span class="score-label">迭代前分数:</span>
                        <span class="score-value old">{{ iter.old_score?.toFixed(2) || 'N/A' }}</span>
                      </div>
                      <div class="score-arrow">→</div>
                      <div class="score-item">
                        <span class="score-label">迭代后分数:</span>
                        <span class="score-value new">{{ iter.new_score?.toFixed(2) || 'N/A' }}</span>
                      </div>
                    </div>
                    <div class="acceleration-info">
                      <span class="accel-label">加速度:</span>
                      <span class="accel-value" :class="{ positive: iter.acceleration > 0, neutral: iter.acceleration === 0 }">
                        {{ (iter.acceleration || 0).toFixed(2) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 新增描述 -->
                <div class="iteration-section" v-if="iter.new_description_part">
                  <div class="section-label">📝 新增描述</div>
                  <div class="description-box">{{ iter.new_description_part }}</div>
                </div>

                <!-- 完整描述 -->
                <div class="iteration-section" v-if="iter.full_description">
                  <div class="section-label">📋 完整描述</div>
                  <div class="description-box full">{{ iter.full_description }}</div>
                </div>

                <!-- 终止状态 -->
                <div class="iteration-section" v-if="iter.video_terminated !== undefined">
                  <div class="section-label">🛑 状态标志</div>
                  <div class="section-content">
                    <div class="status-flag" :class="{ terminated: iter.video_terminated }">
                      <span v-if="iter.video_terminated" class="flag-icon">●</span>
                      <span v-else class="flag-icon">○</span>
                      <span class="flag-text">视频 {{ iter.video_terminated ? '已' : '未' }}终止</span>
                    </div>
                    <div class="status-flag" :class="{ terminated: iter.global_terminated }">
                      <span v-if="iter.global_terminated" class="flag-icon">●</span>
                      <span v-else class="flag-icon">○</span>
                      <span class="flag-text">全局 {{ iter.global_terminated ? '已' : '未' }}终止</span>
                    </div>
                  </div>
                </div>

                <!-- 该迭代的处理日志 -->
                <div class="iteration-section" v-if="iterationProgressLogs[idx] && iterationProgressLogs[idx].length > 0">
                  <div class="section-label">📌 处理步骤</div>
                  <div class="logs-group">
                    <div class="log-item" v-for="(log, lidx) in iterationProgressLogs[idx]" :key="'iter-log-' + lidx">
                      <div class="log-timestamp">{{ formatTime(log.timestamp) }}</div>
                      <div class="log-badge" :class="log.status">{{ log.status }}</div>
                      <div class="log-message">{{ log.message }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最终化阶段 -->
      <div class="timeline-stage" v-if="finalizationLogs.length > 0">
        <div class="stage-header" @click="toggleStage('finalization')">
          <div class="stage-icon finalization">✓</div>
          <div class="stage-content">
            <div class="stage-title">最终化阶段</div>
            <div class="stage-subtitle">生成最终答案</div>
          </div>
          <div class="stage-toggle">
            <span class="toggle-icon">{{ expandedStages.finalization ? '▼' : '▶' }}</span>
          </div>
        </div>

        <div class="stage-body" v-if="expandedStages.finalization">
          <div class="logs-group">
            <div class="log-item" v-for="(log, idx) in finalizationLogs" :key="'final-' + idx">
              <div class="log-timestamp">{{ formatTime(log.timestamp) }}</div>
              <div class="log-badge" :class="log.status">{{ log.status }}</div>
              <div class="log-message">{{ log.message }}</div>
              <div class="log-data" v-if="Object.keys(log.data).length > 0">
                <div v-for="(val, key) in log.data" :key="key" class="data-item">
                  <span class="data-key">{{ key }}:</span>
                  <span class="data-value">{{ formatLogData(val) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref, computed } from 'vue'

const props = defineProps({
  processLogs: {
    type: Object,
    default: null
  }
})

// State management
const expandedStages = ref({
  initialization: true,
  iterations: true,
  finalization: false
})

const expandedIterations = ref({})

// Computed properties
const hasInitialization = computed(() => {
  return props.processLogs?.initialization && props.processLogs.initialization.length > 0
})

const iterationCount = computed(() => {
  return props.processLogs?.iterations?.length || 0
})

const uniqueStages = computed(() => {
  if (!props.processLogs?.progress) return []
  const stages = new Set(props.processLogs.progress.map(log => log.stage))
  return Array.from(stages)
})

const totalDuration = computed(() => {
  if (!props.processLogs?.progress || props.processLogs.progress.length < 2) return '0'
  const logs = props.processLogs.progress
  const start = logs[0].timestamp
  const end = logs[logs.length - 1].timestamp
  return (end - start).toFixed(1)
})

// Filtered logs by stage
const initializationLogs = computed(() => {
  return filterLogsByStage('model_initialization')
    .concat(filterLogsByStage('sampling').filter(log => !log.data?.iteration))
    .concat(filterLogsByStage('description_scoring').filter(log => !log.data?.iteration))
})

const iterationLogs = computed(() => {
  return filterLogsByStage('iteration')
})

const finalizationLogs = computed(() => {
  return filterLogsByStage('finalization').concat(filterLogsByStage('answering'))
})

// Group iterations with their logs
const groupedIterations = computed(() => {
  return props.processLogs?.iterations || []
})

const iterationProgressLogs = computed(() => {
  const logs = {}
  iterationLogs.value.forEach(log => {
    const iterNum = log.data?.iteration ?? null
    if (iterNum !== null) {
      if (!logs[iterNum - 1]) logs[iterNum - 1] = []
      logs[iterNum - 1].push(log)
    }
  })
  return logs
})

// Helper functions
function filterLogsByStage(stage) {
  if (!props.processLogs?.progress) return []
  return props.processLogs.progress.filter(log => log.stage === stage)
}

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

function formatLogData(val) {
  if (typeof val === 'string') return val
  if (typeof val === 'number') return val.toFixed(2)
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}
</script>

<style scoped>
.process-flow {
  width: 100%;
  background: white;
}

/* Timeline Header */
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
}

/* Timeline */
.timeline {
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

/* Timeline Stage */
.timeline-stage {
  margin-bottom: 24px;
  position: relative;
  margin-left: 0;
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

/* Initialization Section */
.init-videos {
  margin-bottom: 16px;
}

.init-video {
  padding: 12px;
  background: white;
  border-radius: 6px;
  margin-bottom: 12px;
  border-left: 3px solid #1890ff;
}

.video-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.video-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item {
  display: flex;
  font-size: 13px;
  gap: 8px;
}

.detail-label {
  color: #666;
  min-width: 70px;
}

.detail-value {
  color: #333;
  flex: 1;
  word-break: break-word;
}

.detail-value.score {
  color: #1890ff;
  font-weight: 600;
}

/* Iteration Section */
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

/* Iteration Sections */
.iteration-section {
  background: white;
  padding: 12px;
  border-radius: 4px;
  border-left: 3px solid #1890ff;
}

.section-label {
  font-weight: 600;
  color: #333;
  font-size: 13px;
  margin-bottom: 8px;
}

.section-content {
  font-size: 13px;
}

.param-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.param-row:last-child {
  margin-bottom: 0;
}

.param-name {
  color: #666;
  min-width: 100px;
}

.param-value {
  color: #333;
  font-weight: 500;
}

/* Score Change */
.score-change {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.score-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.score-label {
  color: #999;
  font-size: 12px;
}

.score-value {
  font-size: 16px;
  font-weight: 600;
}

.score-value.old {
  color: #faad14;
}

.score-value.new {
  color: #52c41a;
}

.score-arrow {
  color: #ccc;
  font-size: 18px;
}

.acceleration-info {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.accel-label {
  color: #666;
  font-size: 13px;
}

.accel-value {
  font-weight: 600;
  font-size: 13px;
}

.accel-value.positive {
  color: #52c41a;
}

.accel-value.neutral {
  color: #999;
}

/* Description Box */
.description-box {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #333;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.description-box.full {
  max-height: 300px;
}

/* Status Flags */
.status-flag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: #666;
}

.status-flag.terminated {
  color: #ff4d4f;
}

.flag-icon {
  font-size: 12px;
}

/* Logs Group */
.logs-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

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
</style>
