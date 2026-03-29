<template>
  <div class="video-player-container" ref="containerRef">
    <video
      ref="videoRef"
      class="video-element"
      :class="{ 'is-loading': isLoading, 'has-error': hasError }"
      controls
      playsinline
      webkit-playsinline
      @loadedmetadata="handleLoadedMetadata"
      @error="handleVideoError"
      @play="handlePlay"
      @pause="handlePause"
      @ended="handleEnded"
    ></video>

    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ loadingText }}</div>
      <div class="loading-progress" v-if="loadingProgress > 0">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <div class="progress-text">{{ loadingProgress.toFixed(0) }}%</div>
      </div>
    </div>

    <div v-if="hasError && !isLoading" class="error-overlay">
      <div class="error-icon">⚠️</div>
      <div class="error-text">{{ errorMessage }}</div>
      <el-button v-if="canRetry" type="primary" size="small" @click="retry">重试</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  autoplay: {
    type: Boolean,
    default: false
  },
  loop: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['loaded', 'error', 'play', 'pause', 'ended'])

const containerRef = ref(null)
const videoRef = ref(null)
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const canRetry = ref(true)
const loadingText = ref('正在加载视频...')
const loadingProgress = ref(0)

async function loadVideo() {
  if (!props.src) return

  isLoading.value = true
  hasError.value = false
  errorMessage.value = ''
  loadingProgress.value = 0
  canRetry.value = true

  try {
    loadingText.value = '正在加载视频...'

    videoRef.value.src = props.src
    videoRef.value.load()

    loadingText.value = '等待视频响应...'
    loadingProgress.value = 30

  } catch (error) {
    console.error('视频加载失败:', error)
    hasError.value = true
    errorMessage.value = '视频加载失败'
    emit('error', error)
  } finally {
    setTimeout(() => {
      isLoading.value = false
    }, 500)
  }
}

function retry() {
  loadVideo()
}

function handleLoadedMetadata() {
  const video = videoRef.value
  if (video) {
    if (props.loop) {
      video.loop = true
    }
    isLoading.value = false
    emit('loaded', {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight
    })
  }
}

function handleVideoError(event) {
  const video = videoRef.value
  if (!video) return

  const error = video.error
  let message = '视频加载失败'

  if (error) {
    switch (error.code) {
      case 1:
        message = '加载被中止'
        canRetry.value = true
        break
      case 2:
        message = '网络错误，请检查网络连接'
        canRetry.value = true
        ElMessage.error('网络错误，视频正在转码中，请稍候重试')
        break
      case 3:
        message = '视频解码失败'
        canRetry.value = true
        ElMessage.warning('视频解码失败，将自动重新加载')
        break
      case 4:
        message = '不支持的视频格式'
        canRetry.value = true
        ElMessage.error('视频格式不支持')
        break
      default:
        message = `未知错误 (code: ${error.code})`
        canRetry.value = true
    }
  }

  hasError.value = true
  errorMessage.value = message
  emit('error', { message, error })
}

function handlePlay() {
  isLoading.value = false
  emit('play')
}

function handlePause() {
  emit('pause')
}

function handleEnded() {
  emit('ended')
}

watch(() => props.src, () => {
  loadVideo()
})

watch(() => props.loop, (newVal) => {
  if (videoRef.value) {
    videoRef.value.loop = newVal
  }
})

onMounted(() => {
  if (props.src) {
    loadVideo()
  }
})

defineExpose({
  play: () => videoRef.value?.play(),
  pause: () => videoRef.value?.pause(),
  retry
})
</script>

<style scoped>
.video-player-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.video-element.is-loading {
  opacity: 0.3;
}

.video-element.has-error {
  opacity: 0;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  gap: 12px;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.loading-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 60%;
  max-width: 200px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #409eff;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  gap: 12px;
  z-index: 10;
}

.error-icon {
  font-size: 48px;
}

.error-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  padding: 0 20px;
}
</style>
