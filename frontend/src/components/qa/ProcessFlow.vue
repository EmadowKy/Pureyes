<template>
  <div class="process-flow">
    <!-- ==================== Header ====================  -->
    <div class="flow-header">
      <div class="header-content">
        <h2 class="header-title">分析过程</h2>
      </div>
    </div>

    <!-- ==================== Content ====================  -->
    <div class="content-flow">
      <!-- 初始化阶段 -->
      <div class="flow-section" v-if="hasInitialization">
        <div class="phase-title">初始化阶段</div>
        <div class="phase-description">初始采样</div>
        <div class="phase-hint" v-if="isInitializationInProgress">正在初始化...</div>

        <div class="videos-grid">
          <div class="video-card" v-for="(video, idx) in processLogs.initialization" :key="'v' + idx">
            <div class="card-header">
              <div class="video-header">
                <span class="video-name">{{ video.video }}</span>
              </div>
            </div>

            <div class="card-body">
              <!-- 描述 -->
              <div class="description-section">
                <div class="section-title">初始描述</div>
                <div class="description-content">{{ video.initial_description }}</div>
              </div>

              <!-- 关键指标 -->
              <div class="metrics">
                <div class="metric">
                  <div class="metric-label">初始分数</div>
                  <div class="metric-value">{{ video.score.toFixed(2) }}</div>
                </div>
                <div class="metric">
                  <div class="metric-label">优先级</div>
                  <div class="metric-value">{{ video.priority.toFixed(2) }}</div>
                </div>
                <div class="metric" v-if="video.frame_bank_size !== undefined">
                  <div class="metric-label">帧库大小</div>
                  <div class="metric-value">{{ video.frame_bank_size }}</div>
                </div>
                <div class="metric" v-if="video.acceleration">
                  <div class="metric-label">加速度</div>
                  <div class="metric-value">{{ video.acceleration.toFixed(2) }}</div>
                </div>
              </div>

              <!-- 帧库信息 -->
              <div class="frames-info" v-if="video.frame_bank && video.frame_bank.length > 0">
                <div class="info-label">帧库 ({{ video.frame_bank.length }} 帧)</div>
                <div class="frames-list">
                  <div class="frame-item" v-for="(frame, fidx) in video.frame_bank.slice(0, 3)" :key="'f' + fidx">
                    {{ frame }}
                  </div>
                  <div class="frame-item more" v-if="video.frame_bank.length > 3">
                    +{{ video.frame_bank.length - 3 }} 更多...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 迭代阶段 -->
      <div class="flow-section" v-if="iterationCount > 0">
        <div class="phase-title">主循环迭代</div>
        <div class="phase-description">{{ iterationCount }} 次智能采样与评分</div>

        <div class="iterations-timeline">
          <div
            class="iteration-card"
            :class="{ loading: !isIterationCompleted(iter) }"
            v-for="(iter, idx) in groupedIterations"
            :key="'i' + idx"
          >
            <!-- 迭代头 -->
            <div class="iteration-header">
              <div class="iteration-number">{{ idx + 1 }}</div>
              <div class="iteration-video">视频: <strong>{{ iter.selected_video }}</strong></div>
              <div class="iteration-status">
                <span
                  class="status-badge"
                  :class="getIterationStatusClass(iter, idx)"
                >
                  {{ getIterationStatusText(iter, idx) }}
                </span>
              </div>
            </div>

            <!-- 迭代内容 -->
            <div class="iteration-body">
              <!-- 采样信息 -->
              <div class="iteration-section" v-if="iter.action">
                <div class="section-title">采样位置</div>
                <div class="sampling-box">
                  <div class="time-info">
                    <span class="time">{{ formatTime(iter.action.target_start) }}s</span>
                    <span class="arrow">→</span>
                    <span class="time">{{ formatTime(iter.action.target_end) }}s</span>
                  </div>
                  <div class="sampling-details">
                    <div class="detail">策略: {{ getActionOptionDescription(iter) }}</div>
                    <div class="detail" v-if="iter.action.description">
                      描述: {{ iter.action.description }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 分数对比 -->
              <div class="iteration-section">
                <div class="section-title">分数变化</div>
                <div class="score-comparison">
                  <div class="score-box before">
                    <div class="score-label">迭代前</div>
                    <div class="score-num">{{ formatNumber(iter.old_score) }}</div>
                  </div>
                  <div class="score-arrow">→</div>
                  <div class="score-box after">
                    <div class="score-label">迭代后</div>
                    <div class="score-num">{{ formatNumber(iter.new_score) }}</div>
                  </div>
                  <div class="acceleration-box" :class="{ positive: iter.acceleration > 0 }">
                    <div class="accel-label">加速度</div>
                    <div class="accel-num">{{ formatNumber(iter.acceleration) }}</div>
                  </div>
                </div>
              </div>

              <!-- 优先级变化 -->
              <div class="iteration-section">
                <div class="section-title">优先级</div>
                <div class="priority-comparison">
                  <div class="priority-item">
                    <span class="label">迭代前:</span>
                    <span class="value">{{ formatNumber(iter.priority_before) }}</span>
                  </div>
                  <div class="priority-item">
                    <span class="label">迭代后:</span>
                    <span class="value">{{ formatNumber(iter.priority_after) }}</span>
                  </div>
                </div>
              </div>

              <!-- 新增描述 -->
              <div class="iteration-section" v-if="iter.new_description_part">
                <div class="section-title">新增描述</div>
                <div class="description-box">{{ iter.new_description_part }}</div>
              </div>

              <!-- 完整描述 -->
              <div class="iteration-section" v-if="iter.full_description">
                <div class="section-title">完整描述</div>
                <div class="description-box full-desc">{{ iter.full_description }}</div>
              </div>

              <div v-if="!isIterationCompleted(iter)" class="iteration-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">模型推理中，结果生成后将自动更新</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最终化阶段 -->
      <div class="flow-section" v-if="finalSectionVisible">
        <div class="phase-title">最终化阶段</div>
        <div class="phase-description">生成最终答案</div>

        <div v-if="showFinalSkeleton" class="final-loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">模型正在生成最终答案...</div>
        </div>

        <div v-else class="final-completed">
          <div class="completed-text">✓ 生成完成</div>
          <div v-if="finalDuration" class="final-duration-info">
            <span class="duration-label">耗时:</span>
            <span class="duration-value">{{ finalDuration }}</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-if="!hasInitialization && iterationCount === 0 && finalizationLogs.length === 0">
        <div class="empty-text">暂无分析过程数据</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  processLogs: {
    type: Object,
    default: null
  },
  showFinalSkeleton: {
    type: Boolean,
    default: false
  }
})

// 本地计时状态 - 前端独立计时，不依赖后端日志更新
const timerState = reactive({
  submitTime: null,      // 从后端获取的提交时间戳（秒）
  secondsElapsed: 0,     // 前端计算的已用秒数
  isCompleted: false     // 任务是否完成
})

let timerInterval = null

function updateTimer() {
  if (timerState.submitTime === null) return
  
  // 简单的计算：已用时间 = 当前时间（秒） - 提交时间（秒）
  const now = Date.now() / 1000
  const elapsed = now - timerState.submitTime
  timerState.secondsElapsed = Math.max(0, elapsed)
}

// 监听 submit_time 变更，初始化计时器
watch(() => props.processLogs?.submit_time, (newSubmitTime) => {
  if (newSubmitTime && timerState.submitTime !== newSubmitTime) {
    timerState.submitTime = newSubmitTime
    updateTimer()
  }
})

// 监听任务完成状态 - 通过 showFinalSkeleton 从 true 变为 false 判断
watch(() => props.showFinalSkeleton, (newVal, oldVal) => {
  // 当骨架屏从显示(true)变为隐藏(false)时，说明答案生成完成
  if (oldVal === true && newVal === false && !timerState.isCompleted) {
    timerState.isCompleted = true
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }
})

// 备选：通过 progress 最后一条记录判断
watch(() => props.processLogs?.progress?.[props.processLogs?.progress?.length - 1], (lastLog) => {
  if (timerState.isCompleted) return
  
  if (lastLog && 
      ((lastLog.stage === 'answering' && lastLog.status === 'completed') ||
       (lastLog.stage === 'finalization' && lastLog.status === 'completed'))) {
    timerState.isCompleted = true
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }
}, { deep: false })

onMounted(() => {
  // 初始化 submit_time
  if (props.processLogs?.submit_time) {
    timerState.submitTime = props.processLogs.submit_time
    updateTimer()
  }
  
  // 检查是否任务已经完成（用于历史记录查看或页面刷新后的恢复）
  const lastLog = props.processLogs?.progress?.[props.processLogs?.progress?.length - 1]
  if (lastLog && 
      ((lastLog.stage === 'answering' && lastLog.status === 'completed') ||
       (lastLog.stage === 'finalization' && lastLog.status === 'completed'))) {
    timerState.isCompleted = true
  } else if (!props.showFinalSkeleton && (props.processLogs?.final_descriptions_str || props.processLogs?.final_descriptions?.length > 0 || props.processLogs?.final_frame_paths?.length > 0)) {
    // 备选判断：如果骨架屏已隐藏且有最终数据，说明已完成
    timerState.isCompleted = true
  } else if (!props.showFinalSkeleton && !props.processLogs?.submit_time) {
    // 对于历史记录（没有 submit_time），如果没有骨架屏就说明已完成
    timerState.isCompleted = true
  }
  
  // 启动计时器（每100ms更新一次，显示流畅）
  // 如果已完成，不需要启动计时
  if (!timerState.isCompleted) {
    timerInterval = setInterval(updateTimer, 100)
  }
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
})

// Computed
const hasInitialization = computed(() => {
  const hasInitLogs = props.processLogs?.initialization && props.processLogs.initialization.length > 0
  return hasInitLogs || iterationCount.value === 0
})

const iterationCount = computed(() => {
  return props.processLogs?.iterations?.length || 0
})

const uniqueStages = computed(() => {
  if (!props.processLogs?.progress) return []
  const stages = new Set(props.processLogs.progress.map(log => log.stage))
  return Array.from(stages)
})

const hasFinalOutput = computed(() => {
  const hasFinalText = !!props.processLogs?.final_descriptions_str ||
    (Array.isArray(props.processLogs?.final_descriptions) && props.processLogs.final_descriptions.length > 0)
  const hasFinalFrames = Array.isArray(props.processLogs?.final_frame_paths) && props.processLogs.final_frame_paths.length > 0
  const hasFinalStage = props.processLogs?.progress?.some(log => log.stage === 'finalization' || log.stage === 'answering')
  return hasFinalText || hasFinalFrames || !!hasFinalStage
})

const isInitializationInProgress = computed(() => {
  const hasInitStage = props.processLogs?.progress?.some(log => log.stage === 'initialization')
  return iterationCount.value === 0 && !hasFinalOutput.value && (hasInitStage || hasInitialization.value)
})

function renderMarkdown(text = '') {
  if (!text) return ''
  const html = marked.parse(text, {
    mangle: false,
    headerIds: false,
    breaks: true
  })
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
}

const finalDescriptionHtml = computed(() => {
  const text = props.processLogs?.final_descriptions_str
  if (text) return renderMarkdown(text)

  const arr = props.processLogs?.final_descriptions
  if (arr && arr.length > 0) {
    const md = arr.map((desc, idx) => `${idx + 1}. ${desc}`).join('\n')
    return renderMarkdown(md)
  }

  return ''
})

const totalDuration = computed(() => {
  // 使用前端本地计时的值，实现连续流畅的秒数显示
  if (timerState.submitTime === null) {
    return '0秒'
  }
  
  const seconds = Math.round(timerState.secondsElapsed)
  return formatDuration(Math.max(0, seconds))
})

const finalDuration = computed(() => {
  // 在任务完成后，使用实际的 progress 时间戳计算耗时
  if (!timerState.isCompleted) {
    return null
  }
  
  const logs = props.processLogs?.progress
  if (!logs || logs.length < 1) {
    return null
  }
  
  // 如果只有一条记录，无法计算，使用本地计数
  if (logs.length < 2) {
    const seconds = Math.round(timerState.secondsElapsed)
    return formatDuration(Math.max(0, seconds))
  }
  
  const startTime = logs[0].timestamp
  const endTime = logs[logs.length - 1].timestamp
  const seconds = Math.round(endTime - startTime)
  return formatDuration(Math.max(0, seconds))
})

const finalizationLogs = computed(() => {
  return filterLogsByStage('finalization').concat(filterLogsByStage('answering'))
})

const finalSectionVisible = computed(() => {
  // 只要有最终化日志或者正在生成答案或已经完成，就显示最终化阶段
  return props.showFinalSkeleton || finalizationLogs.value.length > 0 || timerState.isCompleted
})

const groupedIterations = computed(() => {
  return props.processLogs?.iterations || []
})

function filterLogsByStage(stage) {
  if (!props.processLogs?.progress) return []
  return props.processLogs.progress.filter(log => log.stage === stage)
}

function formatTime(val) {
  if (typeof val === 'number') return val.toFixed(1)
  return String(val)
}

function formatDuration(seconds) {
  if (seconds === 0) return '0秒'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes === 0) {
    return `${secs}秒`
  }
  if (secs === 0) {
    return `${minutes}分`
  }
  return `${minutes}分${secs}秒`
}

function formatNumber(val, digits = 2) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '—'
  return Number(val).toFixed(digits)
}

function isIterationCompleted(iter) {
  // 如果迭代包含了完整的新_score、acceleration和action信息，则判定为已完成
  return iter.new_score !== null && iter.new_score !== undefined && 
         iter.acceleration !== null && iter.acceleration !== undefined &&
         iter.action !== null && iter.action !== undefined
}

function getActionOptionDescription(iter) {
  const option = Number(iter?.action?.option)
  const videoLabel = iter?.selected_video || '当前视频'
  const start = formatTime(iter?.action?.target_start)
  const end = formatTime(iter?.action?.target_end)

  if (option === 1) {
    return `[${start}s, ${end}s] 可能有用，但其他片段也可能有用：探索视频中间部分。`
  }
  if (option === 2) {
    return `我认为 [${start}s, ${end}s] 有用且需要继续深入：探索视频中间部分。`
  }
  if (option === 3) {
    return '此选项不使用。'
  }
  if (option === 4) {
    return '此选项不使用。'
  }
  if (option === 5) {
    return `我想进一步观察 ${videoLabel} 在 ${start}s 到 ${end}s 的完整区间。`
  }
  if (option === 6) {
    return `若已从 ${videoLabel} 获得足够信息可回答问题，或该视频无关/低价值，则终止探索该视频。`
  }

  return `未知策略（Option ${iter?.action?.option ?? 'N/A'}）`
}

function hasNextIteration(idx) {
  return idx < groupedIterations.value.length - 1
}

function getIterationStatusText(iter, idx) {
  if (iter.global_terminated) return '模型判断全局迭代终止'
  if (iter.video_terminated) return '模型判断本视频迭代终止'
  if (!isIterationCompleted(iter)) return '进行中'

  if (iter.action?.option === 6) return '工具选择终止（Option 6）'
  if (typeof iter.new_score === 'number' && iter.new_score >= 0.8) return '分数高于阈值停止迭代'
  if (typeof iter.acceleration === 'number' && iter.acceleration < 0.2) return '加速度低于阈值停止迭代'
  if (hasNextIteration(idx)) return '继续迭代'

  return '主循环结束'
}

function getIterationStatusClass(iter, idx) {
  if (iter.global_terminated) return 'global-terminated'
  if (iter.video_terminated) return 'video-terminated'
  if (!isIterationCompleted(iter)) return 'active'

  if (iter.action?.option === 6) return 'tool-terminated'
  if (typeof iter.new_score === 'number' && iter.new_score >= 0.8) return 'score-terminated'
  if (typeof iter.acceleration === 'number' && iter.acceleration < 0.2) return 'accel-terminated'
  if (hasNextIteration(idx)) return 'continue-iter'

  return 'loop-ended'
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.process-flow {
  width: 100%;
  background: var(--bg-page);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ==================== Header ==================== */
.flow-header {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%);
  padding: 24px;
  border-radius: 12px;
  color: white;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 100%;
}

.header-title {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 700;
}

.header-stats {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  opacity: 0.95;
}

.stat-text {
  font-weight: 600;
}

/* ==================== Content Flow ==================== */

.content-flow {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.flow-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.phase-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 6px;
}

.phase-description {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.phase-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 14px;
}

/* ==================== Videos Grid ==================== */
.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.video-card {
  background: linear-gradient(135deg, var(--bg-page), var(--bg-page-2));
  border: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s;
  animation: fadeIn 0.4s ease-out;
}

.video-card:hover {
  box-shadow: var(--shadow);
  border-color: var(--primary);
}

.card-header {
  padding: 14px;
  background: var(--bg-card);
  border-bottom: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
}

.video-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: var(--text-main);
  font-size: 15px;
}

.card-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.description-section {
  background: var(--bg-card);
  padding: 10px;
  border-radius: 6px;
  border-left: 3px solid var(--primary);
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

.description-content {
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.5;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.metric {
  background: var(--bg-card);
  padding: 10px;
  border-radius: 6px;
  text-align: center;
  border: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
}

.metric-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
}

.frames-info {
  background: var(--bg-card);
  padding: 10px;
  border-radius: 6px;
  border-left: 3px solid var(--success);
}

.info-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--success);
  text-transform: uppercase;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

.frames-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.frame-item {
  font-size: 12px;
  color: var(--text-muted);
  word-break: break-all;
  font-family: 'Fira Code', 'Consolas', monospace;
  line-height: 1.4;
}

.frame-item.more {
  color: var(--text-muted);
  font-style: italic;
}

/* ==================== Iterations ==================== */
.iterations-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.iteration-card {
  background: linear-gradient(135deg, var(--bg-page), var(--bg-page-2));
  border: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s;
  animation: fadeIn 0.5s ease-out backwards;
}

.iteration-card:hover {
  box-shadow: var(--shadow);
  border-color: var(--primary);
}

.iteration-card.loading {
  border-style: dashed;
}

.iteration-header {
  padding: 14px;
  background: var(--bg-card);
  border-bottom: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.iteration-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.iteration-video {
  font-size: 13px;
  color: var(--text-muted);
  flex: 1;
  min-width: 150px;
}

.iteration-status {
  display: flex;
  gap: 6px;
}

.status-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  background: color-mix(in srgb, var(--text-main) 10%, transparent);
  color: var(--text-main);
  text-transform: uppercase;
}

.status-badge.global-terminated,
.status-badge.video-terminated,
.status-badge.tool-terminated,
.status-badge.score-terminated,
.status-badge.accel-terminated {
  background: color-mix(in srgb, var(--primary) 18%, transparent);
  color: var(--primary);
}

.status-badge.continue-iter {
  background: color-mix(in srgb, var(--success) 20%, transparent);
  color: var(--success);
}

.status-badge.loop-ended {
  background: color-mix(in srgb, var(--text-main) 10%, transparent);
  color: var(--text-main);
}

.status-badge.active {
  background: color-mix(in srgb, var(--success) 20%, transparent);
  color: var(--success);
}

.status-badge.completed {
  background: color-mix(in srgb, var(--primary) 20%, transparent);
  color: var(--primary);
}

.iteration-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.iteration-section {
  background: var(--bg-card);
  padding: 12px;
  border-radius: 6px;
}

.sampling-box {
  background: var(--bg-card);
  padding: 12px;
  border-radius: 6px;
}

.time-info {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.time {
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  padding: 4px 10px;
  border-radius: 4px;
}

.arrow {
  color: var(--text-muted);
}

.sampling-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.detail {
  color: var(--text-muted);
}

.score-comparison {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.score-box {
  flex: 1;
  min-width: 100px;
  padding: 12px;
  background: var(--bg-card);
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
  text-align: center;
}

.score-box.before {
  border-left: 4px solid var(--primary);
}

.score-box.after {
  border-left: 4px solid var(--success);
}

.score-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 4px;
}

.score-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
}

.acceleration-box {
  flex: 1;
  min-width: 100px;
  padding: 12px;
  background: var(--bg-card);
  border-radius: 6px;
  border-left: 4px solid var(--primary);
  text-align: center;
}

.acceleration-box.positive {
  border-left: 4px solid var(--success);
}

.accel-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 4px;
}

.accel-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
}

.priority-comparison {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.priority-item {
  flex: 1;
  min-width: 120px;
  padding: 10px;
  background: var(--bg-card);
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.priority-item .label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}

.priority-item .value {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
}

.description-box {
  background: var(--bg-card);
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid var(--primary-2);
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.6;
  word-break: break-word;
}

.description-box.full-desc {
  max-height: 180px;
  overflow-y: auto;
}

.description-box.full-desc::-webkit-scrollbar {
  width: 4px;
}

.description-box.full-desc::-webkit-scrollbar-thumb {
  background: var(--text-muted);
  border-radius: 2px;
}

.iteration-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--text-muted);
  animation: fadeIn 0.4s ease-out backwards;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid color-mix(in srgb, var(--primary) 25%, transparent);
  border-top-color: var(--primary);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ==================== Final ==================== */
.final-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
  animation: fadeIn 0.6s ease-out backwards;
}

.final-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 12px;
}

.final-descriptions-box {
  background: linear-gradient(135deg, var(--bg-page), var(--bg-page-2));
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid var(--primary);
  line-height: 1.8;
  color: var(--text-main);
  font-size: 14px;
}

.final-descriptions-box :deep(p) {
  margin: 0 0 8px 0;
}

.final-descriptions-box :deep(ol),
.final-descriptions-box :deep(ul) {
  margin: 0 0 8px 16px;
  padding-left: 16px;
}

.final-descriptions-box :deep(li) {
  margin-bottom: 4px;
}

.final-descriptions-box :deep(code) {
  background: color-mix(in srgb, var(--text-main) 10%, transparent);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: 'Fira Code', 'Consolas', monospace;
}

.final-desc-line {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.final-desc-line:last-child {
  margin-bottom: 0;
}

.desc-number {
  font-weight: 700;
  color: var(--primary);
  min-width: 24px;
}

.desc-text {
  flex: 1;
}

.final-frames-box {
  background: linear-gradient(135deg, var(--bg-page), var(--bg-page-2));
  border-radius: 8px;
  border-left: 4px solid var(--success);
  overflow: hidden;
}

.final-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--text-muted);
  animation: fadeIn 0.4s ease-out backwards;
}

.final-completed {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--success) 8%, transparent);
  border-left: 3px solid var(--success);
}

.completed-text {
  color: var(--success);
  font-weight: 600;
  font-size: 14px;
}

.final-duration-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  font-size: 14px;
}

.duration-label {
  color: var(--text-muted);
  font-weight: 600;
}

.duration-value {
  color: var(--success);
  font-weight: 700;
  font-size: 16px;
}

.frame-row {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
  gap: 12px;
  font-size: 12px;
}

.frame-row:last-child {
  border-bottom: none;
}

.frame-index {
  font-weight: 700;
  color: var(--success);
  min-width: 40px;
}

.frame-path {
  flex: 1;
  color: var(--text-muted);
  font-family: 'Fira Code', 'Consolas', monospace;
  word-break: break-all;
}

/* ==================== Empty ==================== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
  animation: fadeIn 0.5s ease-out backwards;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
}
</style>
