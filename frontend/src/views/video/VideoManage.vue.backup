<template>
  <div class="layout-wrapper">
    <!-- 顶部导航栏 -->
    <header class="top-nav">
      <div class="nav-left">
        <div class="logo-area">
          <svg viewBox="0 0 24 24" class="logo-svg" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="url(#paint0_linear)"/><path d="M10 8L16 12L10 16V8Z" fill="#ffffff"/><defs><linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#2d73ff"/><stop offset="1" stop-color="#6d3bf5"/></linearGradient></defs></svg>
          <span class="logo-text">Pureyes</span>
        </div>
      </div>
      <div class="nav-right">
        <el-badge is-dot class="notice-badge">
          <el-icon class="bell-icon"><BellFilled /></el-icon>
        </el-badge>
        <el-avatar :size="32" class="user-avatar">管</el-avatar>
      </div>
    </header>

    <div class="dashboard-container">
      <!-- 左侧：视频管理面板 -->
      <aside class="video-panel premium-card">
        <div class="panel-header">
          <h2>视频管理</h2>
          <p class="panel-desc">一站式管理，支持多种视频</p>
          <el-upload
            class="upload-demo"
            action="#"
            :show-file-list="false"
            :http-request="handleUpload"
          >
            <el-button class="gradient-btn" :loading="isUploading">
              <el-icon class="btn-icon"><UploadFilled /></el-icon>
              {{ isUploading ? '上传解析中...' : '上传视频' }}
            </el-button>
          </el-upload>
          <el-progress 
            v-if="isUploading" 
            :percentage="uploadProgress" 
            :show-text="false" 
            class="upload-progress"
            color="#6d3bf5"
          />
        </div>

        <div class="video-list">
          <div class="list-title"><el-icon><Timer /></el-icon> 最近上传</div>
          <div 
            v-for="video in videoList" 
            :key="video.id" 
            class="video-card" 
            :class="{ active: currentVideo && currentVideo.id === video.id }"
          >
            <div class="card-left">
              <el-checkbox v-model="video.selected" class="custom-checkbox"></el-checkbox>
              <div class="video-icon-wrapper" :class="{ 'is-active': currentVideo && currentVideo.id === video.id }">
                <el-icon><VideoPlay /></el-icon>
              </div>
              <div class="video-info" @click="playVideo(video)">
                <template v-if="editingVideoId === video.id">
                  <el-input 
                    v-model="editingVideoName" 
                    size="small" 
                    @blur="saveVideoName(video)"
                    @keyup.enter="saveVideoName(video)"
                    ref="editInputRefs"
                  />
                </template>
                <template v-else>
                  <div class="video-title" :title="video.name">{{ video.name }}</div>
                  <div class="video-meta">
                    <span class="duration-tag">{{ formatDuration(video.duration) }}</span>
                    <span class="status-tag" :class="video.selected ? 'ready' : 'idle'">
                      <span class="status-dot"></span> {{ video.selected ? '分析包含' : '未选择' }}
                    </span>
                  </div>
                </template>
              </div>
              <el-icon class="edit-btn" v-if="editingVideoId !== video.id" @click.stop="startEditVideo(video)">
                <EditPen />
              </el-icon>
            </div>
            
            <el-popconfirm 
              title="确定要删除该视频吗？" 
              confirm-button-text="删除" 
              cancel-button-text="取消" 
              confirm-button-type="danger"
              @confirm="deleteVideo(video.id)"
            >
              <template #reference>
                <el-button class="delete-btn" circle size="small" @click.stop>
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </aside>

      <!-- 右侧：内容区 -->
      <main class="main-panel">
        
        <!-- 上半部分：播放器面板 -->
        <section class="player-panel premium-card" :class="{ 'is-fullscreen': isPlayerFullscreen }" ref="playerPanelRef">
          
          <div class="panel-toolbar overlay-toolbar">
            <el-button class="floating-btn" circle size="small" @click="togglePlayerFullscreen" title="全屏">
              <el-icon v-if="!isPlayerFullscreen"><FullScreen /></el-icon>
              <el-icon v-else><Close /></el-icon>
            </el-button>
          </div>

          <div class="player-wrapper">
            <video 
              v-if="currentVideo" 
              ref="videoRef" 
              :src="currentVideo.url" 
              controls 
              class="video-player"
            ></video>
            <div v-else class="empty-player">
              <el-icon class="empty-icon"><Monitor /></el-icon>
              <p>请在左侧选择视频播放</p>
            </div>
          </div>
        </section>

        <!-- 下半部分：AI 智能问答面板 -->
        <section class="chat-panel premium-card" :class="{ 'is-fullscreen': isChatFullscreen }" ref="chatPanelRef">
          <div class="chat-header">
            <div class="header-left">
              <el-icon class="header-icon"><ChatLineRound /></el-icon>
              <span class="header-title">分析大模型交互</span>
            </div>
            
            <div class="header-right" style="display: flex; align-items: center; gap: 16px;">
              <div class="context-tags">
                <div class="tags-wrapper">
                  <el-tag v-for="v in selectedVideos" :key="v.id" size="small" class="ctx-tag" round effect="plain">
                    {{ v.name }}
                  </el-tag>
                  <span v-if="selectedVideos.length === 0" class="no-ctx">暂无上下文</span>
                </div>
              </div>
              <el-button circle size="small" @click="toggleChatFullscreen" title="全屏">
                <el-icon v-if="!isChatFullscreen"><FullScreen /></el-icon>
                <el-icon v-else><Close /></el-icon>
              </el-button>
            </div>
          </div>

          <div class="chat-history" ref="chatScrollRef">
            <div 
              v-for="(msg, index) in chatHistory" 
              :key="index"
              class="chat-bubble-wrapper"
              :class="msg.role === 'user' ? 'is-user' : 'is-ai'"
            >
              <el-avatar v-if="msg.role === 'ai'" :size="38" class="avatar ai-avatar">
                <el-icon><Cpu /></el-icon>
              </el-avatar>
              <div class="chat-bubble">
                <span v-for="(segment, sIdx) in parseMessage(msg.content)" :key="sIdx">
                  <span v-if="segment.type === 'text'">{{ segment.content }}</span>
                  <span 
                    v-else-if="segment.type === 'timestamp'" 
                    class="timestamp-link"
                    @click="jumpToTime(segment.seconds)"
                  >
                    <el-icon class="time-icon"><Clock /></el-icon>{{ segment.raw }}
                  </span>
                </span>
              </div>
              <el-avatar v-if="msg.role === 'user'" :size="38" class="avatar user-avatar">我</el-avatar>
            </div>
            
            <div v-if="isAiTyping" class="chat-bubble-wrapper is-ai">
              <el-avatar :size="38" class="avatar ai-avatar"><el-icon><Cpu /></el-icon></el-avatar>
              <div class="chat-bubble typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <div class="chat-input-area">
            <div class="input-wrapper">
              <el-input
                v-model="chatInput"
                type="textarea"
                :rows="1"
                :autosize="{ minRows: 1, maxRows: 4 }"
                placeholder="向 AI 提问... (Enter 发送)"
                resize="none"
                class="chat-textarea"
                @keydown.enter="handleEnter"
              />
              <el-button class="send-btn primary-gradient" @click="sendMessage" :disabled="!chatInput.trim() || isAiTyping" circle>
                <el-icon><Promotion /></el-icon>
              </el-button>
            </div>
          </div>
        </section>

      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'

// --- 全屏控制 ---
const isPlayerFullscreen = ref(false)
const isChatFullscreen = ref(false)
const playerPanelRef = ref(null)
const chatPanelRef = ref(null)

const togglePlayerFullscreen = () => {
  isPlayerFullscreen.value = !isPlayerFullscreen.value
}

const toggleChatFullscreen = () => {
  isChatFullscreen.value = !isChatFullscreen.value
}

// --- 状态数据 ---
const videoList = ref([
  { id: 1, name: 'COCO_YOLOv8_Full_Defense.mp4', url: 'https://vjs.zencdn.net/v/oceans.mp4', duration: 46, selected: true },
  { id: 2, name: 'VOC_YOLOv5_Pruning.mp4', url: 'https://vjs.zencdn.net/v/oceans.mp4', duration: 46, selected: false },
  { id: 3, name: 'COCO_YOLOv9_NAD_Test.mp4', url: 'https://vjs.zencdn.net/v/oceans.mp4', duration: 46, selected: true }
])
const currentVideo = ref(videoList.value[0])
const videoRef = ref(null)

const isUploading = ref(false)
const uploadProgress = ref(0)
const editingVideoId = ref(null)
const editingVideoName = ref('')
const editInputRefs = ref(null)

const chatHistory = ref([
  { role: 'ai', content: '您好！我是您的智能防御训练可视化助手。我已经获取了您勾选的实验视频作为上下文。您可以向我提问特定的攻击防御检测时间节点，或者让我进行全局总结分析。' }
])
const chatInput = ref('')
const isAiTyping = ref(false)
const chatScrollRef = ref(null)

const selectedVideos = computed(() => videoList.value.filter(v => v.selected))

// --- 方法 ---

const handleUpload = () => {
  isUploading.value = true
  uploadProgress.value = 0
  const interval = setInterval(() => {
    uploadProgress.value += 15
    if (uploadProgress.value >= 100) {
      clearInterval(interval)
      isUploading.value = false
      const newVideo = {
        id: Date.now(),
        name: `新防御实验监控_${Math.floor(Math.random()*100)}.mp4`,
        url: 'https://vjs.zencdn.net/v/oceans.mp4',
        duration: 46,
        selected: true
      }
      videoList.value.unshift(newVideo)
      ElMessage.success('配置导入解析完成！')
    }
  }, 200)
}

const playVideo = (video) => {
  currentVideo.value = video
}

const startEditVideo = (video) => {
  editingVideoId.value = video.id
  editingVideoName.value = video.name
  nextTick(() => {
    if (editInputRefs.value && editInputRefs.value.length > 0) {
      editInputRefs.value[0].focus()
    } else if (editInputRefs.value) {
      editInputRefs.value.focus()
    }
  })
}

const saveVideoName = (video) => {
  if (editingVideoName.value.trim()) {
    video.name = editingVideoName.value.trim()
  }
  editingVideoId.value = null
}

const deleteVideo = (id) => {
  videoList.value = videoList.value.filter(v => v.id !== id)
  if (currentVideo.value && currentVideo.value.id === id) {
    currentVideo.value = videoList.value.length > 0 ? videoList.value[0] : null
  }
  ElMessage.success('实验记录已删除')
}

const formatDuration = (seconds) => {
  if (isNaN(seconds)) return '00:00'
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const jumpToTime = (timeInSeconds) => {
  if (!currentVideo.value && selectedVideos.value.length > 0) {
    playVideo(selectedVideos.value[0])
  }
  nextTick(() => {
    if (videoRef.value) {
      videoRef.value.currentTime = timeInSeconds
      videoRef.value.play()
    }
  })
}

const parseMessage = (text) => {
  const regex = /\[(\d{2}):(\d{2})\]/g
  const segments = []
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.substring(lastIndex, match.index) })
    }
    const m = parseInt(match[1], 10)
    const s = parseInt(match[2], 10)
    segments.push({ type: 'timestamp', raw: match[0], seconds: m * 60 + s })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.substring(lastIndex) })
  }
  return segments
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatScrollRef.value) {
      chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
    }
  })
}

const handleEnter = (e) => {
    if (e.shiftKey) return; 
    e.preventDefault();
    sendMessage();
}

const sendMessage = () => {
  if (!chatInput.value.trim() || isAiTyping.value) return
  
  const userMsg = chatInput.value.trim()
  chatHistory.value.push({ role: 'user', content: userMsg })
  chatInput.value = ''
  scrollToBottom()

  isAiTyping.value = true

  setTimeout(() => {
    let aiResponse = ''
    if (userMsg.includes('时间') || userMsg.includes('节点')) {
      aiResponse = `为您找到了关键日志节点：预警模型触发在 [00:05] 开始，随后在 [00:18] 成功通过微调平滑曲线，建议您直接跳转查看这段时期的评估。`
    } else {
      aiResponse = `根据当前选择的实验上下文分析，发现在 [00:35] 处生成了对应的综合报告，整体效果良好。您可以点击时间戳跳转查看最终结果。`
    }
    
    chatHistory.value.push({ role: 'ai', content: aiResponse })
    isAiTyping.value = false
    scrollToBottom()
  }, 1200)
}

watch(() => chatHistory.value.length, () => {
  scrollToBottom()
})

</script>

<style scoped>
:root {
  --primary-color: #2d73ff;
  --primary-gradient: linear-gradient(135deg, #2d73ff 0%, #6d3bf5 100%);
  --bg-color: #f2f4f8;
  --text-main: #303133;
  --text-regular: #606266;
  --text-secondary: #909399;
  --border-radius: 16px;
  --card-shadow: 0 6px 24px rgba(0, 0, 0, 0.04);
}

.layout-wrapper {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: var(--bg-color, #f2f4f8);
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.top-nav {
  height: 60px;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.03);
  z-index: 50;
}

.nav-left {
  display: flex;
  align-items: center;
}

.logo-area {
  display: flex;
  align-items: center;
  margin-right: 48px;
  cursor: pointer;
}

.logo-svg {
  width: 28px;
  height: 28px;
  margin-right: 12px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #2d73ff 0%, #6d3bf5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.bell-icon {
  font-size: 20px;
  color: #bbbfc8;
  cursor: pointer;
  transition: color 0.3s;
}
.bell-icon:hover {
  color: #2d73ff;
}
.user-avatar {
  background: linear-gradient(135deg, #2d73ff 0%, #6d3bf5 100%);
  color: white;
  cursor: pointer;
}

.dashboard-container {
  flex: 1;
  display: flex;
  padding: 24px 32px;
  gap: 24px;
  overflow: hidden;
}

.premium-card {
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.premium-card.is-fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 9999 !important;
  border-radius: 0 !important;
  margin: 0 !important;
}

.video-panel {
  width: 380px;
  flex-shrink: 0;
}

.panel-header {
  padding: 24px;
  border-bottom: 1px solid #f0f2f5;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
  font-weight: 600;
}

.panel-desc {
  font-size: 13px;
  color: #909399;
  margin: 8px 0 20px 0;
}

.gradient-btn {
  width: 100%;
  height: 44px;
  border: none;
  background: linear-gradient(135deg, #2d73ff 0%, #6d3bf5 100%);
  color: white;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  transition: opacity 0.3s, transform 0.1s;
}

.gradient-btn:hover {
  opacity: 0.9;
  color: white;
  transform: translateY(-1px);
}
.gradient-btn:active {
  transform: translateY(1px);
}

.btn-icon {
  margin-right: 6px;
  font-size: 18px;
}

.upload-demo :deep(.el-upload) {
  width: 100%;
}

.video-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
.video-list::-webkit-scrollbar {
  width: 6px;
}
.video-list::-webkit-scrollbar-thumb {
  background-color: #e4e7ed;
  border-radius: 3px;
}

.list-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.video-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin-bottom: 12px;
  border-radius: 12px;
  background-color: #fcfcfd;
  border: 1px solid #f0f2f5;
  transition: all 0.3s;
}

.video-card:hover {
  background-color: #fff;
  border-color: #d9e6ff;
  box-shadow: 0 4px 12px rgba(45, 115, 255, 0.08);
}

.video-card.active {
  background-color: #f0f5ff;
  border-color: #2d73ff;
}

.card-left {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

.video-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: #f0f2f5;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 12px;
  font-size: 18px;
  transition: all 0.3s;
}

.video-icon-wrapper.is-active {
  background: linear-gradient(135deg, #2d73ff 0%, #6d3bf5 100%);
  color: white;
}

.video-info {
  flex: 1;
  overflow: hidden;
  cursor: pointer;
}

.video-title {
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  transition: color 0.3s;
  margin-bottom: 6px;
}

.video-title:hover {
  color: #2d73ff;
}

.video-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duration-tag {
  font-size: 12px;
  background-color: #f0f2f5;
  color: #606266;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.status-tag {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-tag.ready { color: #52c41a; }
.status-tag.ready .status-dot { background-color: #52c41a; }
.status-tag.idle { color: #909399; }
.status-tag.idle .status-dot { background-color: #dcdfe6; }

.edit-btn {
  font-size: 14px;
  color: #c0c4cc;
  cursor: pointer;
  margin-left: 8px;
  padding: 4px;
  transition: color 0.3s;
}
.edit-btn:hover {
  color: #2d73ff;
}
.delete-btn {
  opacity: 0;
  transition: opacity 0.3s;
  border: none;
  background-color: #fef0f0;
  color: #f56c6c;
}
.delete-btn:hover {
  background-color: #f56c6c;
  color: white;
}
.video-card:hover .delete-btn {
  opacity: 1;
}

.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
  height: 100%;
}

.player-panel {
  flex: 0 0 55%;
}

.overlay-toolbar {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 500;
  opacity: 0.1;
  transition: opacity 0.3s;
}

.player-panel:hover .overlay-toolbar {
  opacity: 1;
}

.floating-btn {
  background-color: rgba(0, 0, 0, 0.4);
  border: none;
  color: #fff;
  backdrop-filter: blur(4px);
}
.floating-btn:hover {
  background-color: rgba(0, 0, 0, 0.8);
}

.player-wrapper {
  flex: 1;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
  outline: none;
  background-color: #000;
}

.empty-player {
  color: #909399;
  text-align: center;
}
.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.chat-panel {
  flex: 1;
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.header-icon {
  color: #2d73ff;
  margin-right: 8px;
  font-size: 20px;
}

.context-tags {
  display: flex;
  align-items: center;
  gap: 12px;
}

.context-label {
  font-size: 13px;
  color: #909399;
}

.tags-wrapper {
  display: flex;
  gap: 8px;
}

.no-ctx {
  font-size: 13px;
  color: #c0c4cc;
}

.ctx-tag {
  color: #2d73ff;
  border-color: #d9e6ff;
  background-color: #f0f5ff;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.chat-history::-webkit-scrollbar {
  width: 6px;
}
.chat-history::-webkit-scrollbar-thumb {
  background-color: #e4e7ed;
  border-radius: 3px;
}

.chat-bubble-wrapper {
  display: flex;
  align-items: flex-start;
  max-width: 85%;
}

.chat-bubble-wrapper.is-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.chat-bubble-wrapper.is-ai {
  align-self: flex-start;
}

.avatar {
  flex-shrink: 0;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.ai-avatar {
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  color: white;
  margin-right: 16px;
}

.user-avatar {
  background-color: #f2f4f8;
  color: #303133;
  margin-left: 16px;
}

.chat-bubble {
  padding: 14px 20px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}

.is-user .chat-bubble {
  background: linear-gradient(135deg, #2d73ff 0%, #6d3bf5 100%);
  color: #ffffff;
  border-top-right-radius: 4px;
}

.is-user .chat-bubble .timestamp-link {
  color: #fff;
  background-color: rgba(255,255,255,0.2);
}

.is-ai .chat-bubble {
  background-color: #f5f7fa;
  color: #303133;
  border-top-left-radius: 4px;
}

.timestamp-link {
  color: #2d73ff;
  cursor: pointer;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: rgba(45,115,255,0.1);
  transition: all 0.2s;
  margin: 0 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.timestamp-link:hover {
  background-color: #2d73ff;
  color: white;
}

.time-icon {
  font-size: 14px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 16px 20px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background-color: #909399;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}
.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.chat-input-area {
  padding: 20px 24px;
  border-top: 1px solid #f0f2f5;
  background-color: #fff;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  background-color: #f9fafc;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 8px 16px;
  transition: border-color 0.3s;
}

.input-wrapper:focus-within {
  border-color: #2d73ff;
  box-shadow: 0 0 0 2px rgba(45,115,255,0.1);
}

.chat-textarea :deep(.el-textarea__inner) {
  border: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
  padding: 8px 0;
  font-size: 14px;
}

.send-btn {
  border: none;
  width: 40px;
  height: 40px;
  color: white;
  margin-bottom: 4px;
  transition: transform 0.2s;
}
.send-btn:not(:disabled):hover {
  transform: scale(1.05);
}
.primary-gradient {
  background: linear-gradient(135deg, #2d73ff 0%, #6d3bf5 100%);
}
.primary-gradient:disabled {
  background: #dcdfe6;
  color: #ffffff;
}
</style>
