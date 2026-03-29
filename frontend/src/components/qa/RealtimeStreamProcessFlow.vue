<template>
  <div class="realtime-process-flow" ref="flowRef">
    <div class="stream-header">
      <div class="title">实时分析过程</div>
      <div class="status-chip" :class="statusClass">{{ statusText }}</div>
    </div>

    <div v-if="state.status === 'processing' && state.processLogs.progress.length === 0" class="waiting">
      <div class="spinner"></div>
      <div class="pending-badge">pending</div>
      <p>系统正在预热</p>
    </div>

    <div v-else>
      <ProcessFlow :process-logs="state.processLogs" :show-final-skeleton="isAnswering && state.status === 'processing'" />
      <div v-if="state.status === 'processing'" class="live-hint">
        数据实时更新中...
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted, onUnmounted, computed, ref, nextTick } from 'vue'
import { qaApi } from '../../api/qa'
import ProcessFlow from './ProcessFlow.vue'

const props = defineProps({
  taskId: { type: String, required: true },
  token: { type: String, default: '' }
})

const emit = defineEmits(['complete'])

const state = reactive({
  processLogs: {
    initialization: [],
    iterations: [],
    progress: [],
    final_descriptions_str: '',
    final_frame_paths: [],
    submit_time: null  // 添加 submit_time 用于前端计时
  },
  status: 'processing',
  source: null
})
const isAnswering = ref(false)
const flowRef = ref(null)

const statusText = computed(() => {
  if (state.status === 'completed') return '已完成'
  if (state.status === 'failed') return '失败'
  return '进行中'
})

const statusClass = computed(() => ({
  success: state.status === 'completed',
  failure: state.status === 'failed'
}))

function upsertInitialization(video, payload = {}) {
  if (!video) return
  const idx = state.processLogs.initialization.findIndex(v => v.video === video)
  const base = idx >= 0 ? state.processLogs.initialization[idx] : { video }
  const next = {
    ...base,
    ...payload,
    video
  }
  if (idx >= 0) {
    state.processLogs.initialization[idx] = next
  } else {
    state.processLogs.initialization.push(next)
  }
}

function mergeIteration(iterLog = {}) {
  if (!iterLog.iteration) return
  const idx = Math.max(iterLog.iteration - 1, 0)
  while (state.processLogs.iterations.length <= idx) {
    state.processLogs.iterations.push({})
  }
  state.processLogs.iterations[idx] = {
    ...state.processLogs.iterations[idx],
    ...iterLog
  }
}

function mergeProcessLogs(incoming = {}) {
  if (incoming.initialization) {
    state.processLogs.initialization = [...incoming.initialization]
  }
  if (incoming.iterations) {
    incoming.iterations.forEach(mergeIteration)
  }
  if (incoming.progress) {
    state.processLogs.progress = [...incoming.progress]
  }
  if (incoming.submit_time) {
    state.processLogs.submit_time = incoming.submit_time
  }
  if (incoming.final_descriptions) {
    state.processLogs.final_descriptions = incoming.final_descriptions
  }
  if (incoming.final_descriptions_str) {
    state.processLogs.final_descriptions_str = incoming.final_descriptions_str
  }
  if (incoming.final_frame_paths) {
    state.processLogs.final_frame_paths = incoming.final_frame_paths
  }
}

function handleProgress(item) {
  if (!item) return
  
  // 处理特殊的提交时间信息
  if (item.stage === 'system' && item.status === 'submit_time') {
    state.processLogs.submit_time = item.data?.submit_time
    return
  }
  
  state.processLogs.progress.push(item)
  const data = item.data || {}

  if (item.stage === 'answering') {
    isAnswering.value = item.status === 'started'
  }

  if (data.iteration_data) {
    mergeIteration(data.iteration_data)
  }

  if (data.video && !data.iteration) {
    upsertInitialization(data.video, {
      initial_description: data.description || data.initial_description,
      score: data.score,
      priority: data.priority,
      frame_bank_size: data.frame_bank_size,
      acceleration: data.acceleration
    })
  }

  if (data.final_descriptions) {
    state.processLogs.final_descriptions_str = data.final_descriptions
  }

  scrollToBottom()
}

function handleComplete(payload) {
  state.status = payload?.status || 'completed'
  isAnswering.value = false
  if (payload?.result?.process_logs) {
    mergeProcessLogs(payload.result.process_logs)
  }
  emit('complete', state.status)
  scrollToBottom()
}

function handleError() {
  state.status = 'failed'
  isAnswering.value = false
  emit('complete', state.status)
}

function scrollToBottom() {
  nextTick(() => {
    if (flowRef.value) {
      flowRef.value.scrollTop = flowRef.value.scrollHeight
    }
  })
}

onMounted(() => {
  state.source = qaApi.subscribeTaskProgress(
    props.taskId,
    handleProgress,
    handleComplete,
    handleError,
    props.token
  )
})

onUnmounted(() => {
  if (state.source) {
    state.source.close()
    state.source = null
  }
})
</script>

<style scoped>
.realtime-process-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 100%;
  overflow-y: auto;
}

.stream-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-soft);
}

.title {
  font-weight: 700;
  color: var(--text-main);
}

.status-chip {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: color-mix(in srgb, var(--primary) 18%, transparent);
  color: var(--primary);
}

.status-chip.success {
  background: color-mix(in srgb, var(--success) 18%, transparent);
  color: var(--success);
}

.status-chip.failure {
  background: color-mix(in srgb, var(--danger) 18%, transparent);
  color: var(--danger);
}

.waiting {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  background: var(--bg-card);
  border-radius: 10px;
  border: 1px dashed var(--border-soft);
  color: var(--text-muted);
}

.spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 3px solid color-mix(in srgb, var(--primary) 25%, transparent);
  border-top-color: var(--primary);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.pending-badge {
  padding: 4px 8px;
  background: #e0e0e0;
  color: #666666;
  font-size: 11px;
  font-weight: 600;
  border-radius: 3px;
  letter-spacing: 0.5px;
}

.live-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
