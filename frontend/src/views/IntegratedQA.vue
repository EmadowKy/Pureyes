<template>
  <div class="integrated-qa-container">
    <!-- 用户信息栏 -->
    <div class="user-bar">
      <div class="user-info">
        <span class="user-label">当前用户：</span>
        <span class="username-display">{{ username }}</span>
      </div>
      <div class="actions">
        <button @click="goToProfile" class="btn-profile">用户信息</button>
      </div>
    </div>

    <!-- 完成通知横幅 -->
    <transition name="slide-down">
      <div v-if="showNotification" class="notification-banner" :class="notificationType">
        <div class="notification-content">
          <span class="notification-icon">{{ notificationType === 'success' ? '✅' : '⚠️' }}</span>
          <span class="notification-message">{{ notificationMessage }}</span>
        </div>
        <button @click="showNotification = false" class="notification-close">×</button>
      </div>
    </transition>

    <div class="main-layout">
      <!-- 左侧：视频列表面板 -->
      <aside class="video-panel">
        <div class="panel-header">
          <h2><el-icon><VideoPlay /></el-icon> 视频选择</h2>
          <p class="panel-desc">选择要分析的视频</p>
          <el-button 
            type="primary" 
            size="small" 
            @click="showUploadDialog = true"
            class="btn-upload"
          >
            <el-icon><Upload /></el-icon> 上传视频
          </el-button>
        </div>

        <div class="video-list">
          <div 
            v-for="video in videoList" 
            :key="video.video_id" 
            class="video-item" 
            :class="{ active: currentVideo && currentVideo.video_id === video.video_id }"
            @click="playVideo(video)"
          >
            <div class="video-icon-wrapper" :class="{ 'is-active': currentVideo && currentVideo.video_id === video.video_id }">
              <el-icon><VideoPlay /></el-icon>
            </div>
            <div class="video-info">
              <div class="video-title" :title="video.video_name">{{ video.video_name }}</div>
              <div class="video-path">{{ video.upload_time }}</div>
            </div>
            <div class="video-actions">
              <el-checkbox 
                v-model="video.selected" 
                class="video-checkbox"
                @click.stop
              ></el-checkbox>
              <el-button 
                size="small" 
                type="danger" 
                @click.stop="handleDeleteVideo(video)"
                title="删除视频"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <div class="video-stats">
          <div class="stat-item">
            <span class="stat-label">总视频数</span>
            <span class="stat-value">{{ videoList.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已选择</span>
            <span class="stat-value highlight">{{ selectedVideos.length }}</span>
          </div>
        </div>
      </aside>

      <!-- 中间：播放器面板 -->
      <section class="player-section">
        <div class="player-card">
          <div class="player-toolbar">
            <div class="player-title">
              <el-icon><Monitor /></el-icon>
              <span>{{ currentVideo ? currentVideo.name : '请选择视频' }}</span>
            </div>
            <div class="player-actions">
              <el-button @click="togglePlayerFullscreen" circle size="small" title="全屏">
                <el-icon v-if="!isPlayerFullscreen"><FullScreen /></el-icon>
                <el-icon v-else><Close /></el-icon>
              </el-button>
            </div>
          </div>

          <div class="player-wrapper" ref="playerWrapperRef">
            <video 
              v-if="currentVideo" 
              ref="videoRef" 
              :src="getVideoUrl(currentVideo.video_path)" 
              controls 
              class="video-player"
            ></video>
            <div v-else class="empty-player">
              <el-icon class="empty-icon"><Monitor /></el-icon>
              <p>请在左侧选择视频播放</p>
            </div>
          </div>
        </div>

        <!-- 快捷操作区 -->
        <div class="quick-actions">
          <el-button type="primary" @click="showAskDialog = true" class="btn-ask-primary">
            <el-icon><Plus /></el-icon> 新建问答
          </el-button>
          <el-button @click="askWithCurrentVideo" :disabled="!currentVideo">
            <el-icon><ChatLineRound /></el-icon> 快速提问当前视频
          </el-button>
        </div>
      </section>

      <!-- 右侧：QA 记录面板 -->
      <section class="qa-section">
        <!-- 顶部统计栏 -->
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-label">总记录数</span>
            <span class="stat-value">{{ stats.total }}</span>
          </div>
          <div class="stat-item success">
            <span class="stat-label">成功</span>
            <span class="stat-value">{{ stats.success }}</span>
          </div>
          <div class="stat-item failure">
            <span class="stat-label">失败</span>
            <span class="stat-value">{{ stats.failure }}</span>
          </div>
          <div v-if="stats.processing > 0" class="stat-item processing">
            <span class="stat-label">进行中</span>
            <span class="stat-value">{{ stats.processing }}</span>
          </div>
          <div class="stat-actions">
            <el-button @click="handleExport" size="small" title="导出记录">
              <el-icon><Download /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 搜索和筛选 -->
        <div class="search-bar">
          <input 
            v-model="searchQuery" 
            placeholder="搜索问题或答案..." 
            class="search-input"
            @input="handleSearch"
          />
          <select v-model="filterStatus" class="filter-select" @change="handleFilter">
            <option value="all">全部状态</option>
            <option value="processing">进行中</option>
            <option value="success">成功</option>
            <option value="failure">失败</option>
          </select>
        </div>

        <!-- 问答记录列表 -->
        <div class="records-list" ref="recordsListRef">
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>加载中...</p>
          </div>

          <div v-else-if="records.length === 0" class="empty-state">
            <div class="empty-icon">💬</div>
            <p>暂无问答记录</p>
            <el-button type="primary" @click="showAskDialog = true">
              开始第一个问答
            </el-button>
          </div>

          <div v-else class="records-grid">
            <div 
              v-for="record in records" 
              :key="record.record_id" 
              class="record-card"
              :class="{ 
                'record-processing': record.status === 'processing',
                'record-failure': record.status === 'failed' || record.success === false,
                'record-success': record.status === 'completed' && record.success !== false
              }"
            >
              <div class="record-header">
                <div class="record-meta">
                  <span class="record-time">{{ formatTime(record.timestamp) }}</span>
                  <span 
                    v-if="record.status === 'processing'"
                    class="record-status status-processing"
                  >
                    <span class="pulse-dot"></span>
                    进行中
                  </span>
                  <span 
                    v-else-if="record.status === 'completed' && record.success !== false"
                    class="record-status status-success"
                  >
                    成功
                  </span>
                  <span 
                    v-else-if="record.status === 'failed' || record.success === false"
                    class="record-status status-failure"
                  >
                    失败
                  </span>
                </div>
                <div class="record-actions">
                  <button 
                    v-if="record.status !== 'processing'"
                    @click="viewRecord(record)" 
                    class="btn-icon" 
                    title="查看详情"
                  >
                    👁
                  </button>
                  <button @click="deleteRecord(record.record_id)" class="btn-icon" title="删除">
                    🗑
                  </button>
                </div>
              </div>
              
              <div class="record-content">
                <div class="record-question">
                  <span class="label">问：</span>
                  <span class="text">{{ record.question }}</span>
                </div>
                <div class="record-answer">
                  <span class="label">答：</span>
                  <span class="text answer-text">
                    <span v-if="record.status === 'processing'" class="processing-text">
                      <span class="spinner-small"></span>
                      AI 正在分析中...
                    </span>
                    <span v-else>{{ truncateAnswer(record.model_result?.answer || record.model_result?.predicted_answer || '无回答') }}</span>
                  </span>
                </div>
              </div>

              <div class="record-footer">
                <div class="video-tags">
                  <span 
                    v-for="(video, index) in record.video_paths" 
                    :key="index" 
                    class="video-tag"
                  >
                    视频 {{ index + 1 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="pagination">
          <el-button 
            :disabled="currentPage === 1" 
            @click="changePage(currentPage - 1)"
            size="small"
          >
            上一页
          </el-button>
          <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
          <el-button 
            :disabled="currentPage === totalPages" 
            @click="changePage(currentPage + 1)"
            size="small"
          >
            下一页
          </el-button>
        </div>
      </section>
    </div>

    <!-- 提问对话框 -->
    <AskDialog 
      v-if="showAskDialog" 
      :preselected-videos="preselectedVideos"
      @close="showAskDialog = false; preselectedVideos = []"
      @submit="handleAskSubmit"
    />

    <!-- 详情对话框 -->
    <RecordDetailDialog
      v-if="showDetailDialog"
      :record="selectedRecord"
      @close="showDetailDialog = false"
    />

    <!-- 视频上传对话框 -->
    <el-dialog
      v-model="showUploadDialog"
      title="上传视频"
      width="500px"
    >
      <div class="upload-form">
        <el-form label-width="80px">
          <el-form-item label="视频名称">
            <el-input v-model="uploadVideoName" placeholder="请输入视频名称" />
          </el-form-item>
          <el-form-item label="视频文件">
            <el-upload
              class="upload-demo"
              action=""
              :auto-upload="false"
              :on-change="handleFileChange"
              :show-file-list="false"
            >
              <el-button size="small" type="primary">选择文件</el-button>
              <template #tip>
                <div class="el-upload__tip">
                  请选择 MP4 格式的视频文件
                </div>
              </template>
            </el-upload>
            <div v-if="uploadVideoFile" class="file-info">
              已选择: {{ uploadVideoFile.name }}
            </div>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showUploadDialog = false">取消</el-button>
          <el-button type="primary" @click="handleUploadVideo">上传</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { qaApi } from '../api/qa'
import { videoApi } from '../api/video'
import { getAuthInfo } from '../api/auth'
import AskDialog from '../components/qa/AskDialog.vue'
import RecordDetailDialog from '../components/qa/RecordDetailDialog.vue'
import { VideoPlay, Monitor, FullScreen, Close, Plus, ChatLineRound, Download, Upload, Delete } from '@element-plus/icons-vue'

const router = useRouter()

// 用户名状态
const username = ref('用户')

onMounted(() => {
  // 获取当前用户信息
  const authInfo = getAuthInfo()
  if (authInfo.user && authInfo.user.username) {
    username.value = authInfo.user.username
  }
  
  loadVideos()
  loadStats()
  loadRecords()
  startPolling()
})

// --- 跳转到用户信息页 ---
function goToProfile() {
  router.push('/profile')
}

// --- 通知系统 ---
const showNotification = ref(false)
const notificationType = ref('success')
const notificationMessage = ref('')

function showNotificationBanner(message, type = 'success') {
  notificationMessage.value = message
  notificationType.value = type
  showNotification.value = true
  
  setTimeout(() => {
    showNotification.value = false
  }, 5000)
}

// --- 视频管理 ---
const videoList = ref([])
const currentVideo = ref(null)
const videoRef = ref(null)
const isPlayerFullscreen = ref(false)
const playerWrapperRef = ref(null)
const showUploadDialog = ref(false)
const uploadVideoName = ref('')
const uploadVideoFile = ref(null)

async function loadVideos() {
  try {
    const response = await videoApi.getVideoList()
    if ((response.code === 0 || response.code === 200) && response.data) {
      videoList.value = response.data.videos.map(video => ({
        ...video,
        selected: false
      }))
      if (videoList.value.length > 0) {
        currentVideo.value = videoList.value[0]
      }
    }
  } catch (error) {
    console.error('加载视频列表失败:', error)
    ElMessage.error('加载视频列表失败')
  }
}

function getVideoUrl(videoPath) {
  // 从完整路径中提取文件名
  const filename = videoPath.split('/').pop()
  return `/api/video/uploads/${filename}`
}

// 视频上传处理
function handleFileChange(file, fileList) {
  if (file) {
    uploadVideoFile.value = file.raw
    if (!uploadVideoName.value) {
      uploadVideoName.value = file.name.replace(/\.[^/.]+$/, "")
    }
  }
}

async function handleUploadVideo() {
  if (!uploadVideoName.value || !uploadVideoFile.value) {
    ElMessage.warning('请填写视频名称并选择视频文件')
    return
  }

  try {
    await videoApi.uploadVideo(uploadVideoName.value, uploadVideoFile.value)
    ElMessage.success('视频上传成功')
    showUploadDialog.value = false
    uploadVideoName.value = ''
    uploadVideoFile.value = null
    await loadVideos()
  } catch (error) {
    console.error('视频上传失败:', error)
    ElMessage.error('视频上传失败')
  }
}

// 视频删除处理
async function handleDeleteVideo(video) {
  try {
    await ElMessageBox.confirm(
      `确定要删除视频 "${video.video_name}" 吗？`,
      '删除视频',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await videoApi.deleteVideo(video.video_id)
    ElMessage.success('视频删除成功')
    await loadVideos()
    if (currentVideo.value && currentVideo.value.video_id === video.video_id) {
      currentVideo.value = videoList.value.length > 0 ? videoList.value[0] : null
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('视频删除失败:', error)
      ElMessage.error('视频删除失败')
    }
  }
}

function playVideo(video) {
  currentVideo.value = video
}

function togglePlayerFullscreen() {
  isPlayerFullscreen.value = !isPlayerFullscreen.value
}

const selectedVideos = computed(() => videoList.value.filter(v => v.selected))

// --- 轮询机制 ---
let pollingInterval = null
const processedTasks = new Set()

function startPolling() {
  pollingInterval = setInterval(async () => {
    await checkProcessingTasks()
  }, 3000)
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

onUnmounted(() => {
  stopPolling()
})

async function checkProcessingTasks() {
  try {
    const res = await qaApi.getRecords({ page: 1, limit: 100 })
    if (res.data) {
      const processingRecords = res.data.records.filter(r => r.status === 'processing')
      
      for (const record of processingRecords) {
        if (processedTasks.has(record.record_id)) {
          continue
        }
        
        const statusRes = await qaApi.getRecord(record.record_id)
        const data = statusRes.data
        
        if (data && (data.status === 'completed' || data.status === 'failed' || data.success !== undefined)) {
          processedTasks.add(record.record_id)
          
          await loadRecords()
          await loadStats()
          
          if (data.status === 'completed' || data.success === true) {
            showNotificationBanner(`"${truncateAnswer(data.question, 30)}" 已完成！`, 'success')
          } else if (data.status === 'failed') {
            showNotificationBanner(`"${truncateAnswer(data.question, 30)}" 处理失败`, 'error')
          } else if (data.success === false) {
            showNotificationBanner(`"${truncateAnswer(data.question, 30)}" 处理失败`, 'error')
          }
        }
      }
    }
  } catch (error) {
    console.error('轮询检查失败:', error)
  }
}

// --- QA 记录管理 ---
const loading = ref(false)
const showAskDialog = ref(false)
const showDetailDialog = ref(false)
const selectedRecord = ref(null)
const searchQuery = ref('')
const filterStatus = ref('all')
const preselectedVideos = ref([])

const stats = reactive({
  total: 0,
  success: 0,
  failure: 0,
  processing: 0
})

const records = ref([])
const currentPage = ref(1)
const pageSize = 10
const totalPages = ref(1)

async function loadStats() {
  try {
    const res = await qaApi.getSummary()
    if (res.data) {
      stats.total = res.data.total_records || 0
      stats.success = res.data.success_count || 0
      stats.failure = res.data.failure_count || 0
      stats.processing = res.data.processing_count || 0
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

async function loadRecords() {
  loading.value = true
  try {
    const res = await qaApi.getRecords({
      page: currentPage.value,
      limit: pageSize
    })
    if (res.data) {
      records.value = res.data.records || []
      totalPages.value = Math.ceil((res.data.total || 0) / pageSize)
    }
  } catch (error) {
    console.error('加载记录失败:', error)
    showNotificationBanner('加载记录失败', 'error')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  console.log('搜索:', searchQuery.value)
}

function handleFilter() {
  console.log('筛选状态:', filterStatus.value)
}

function viewRecord(record) {
  selectedRecord.value = record
  showDetailDialog.value = true
}

async function deleteRecord(recordId) {
  if (!confirm('确定要删除这条问答记录吗？')) return
  
  try {
    await qaApi.deleteRecord(recordId)
    showNotificationBanner('删除成功', 'success')
    await loadStats()
    await loadRecords()
  } catch (error) {
    console.error('删除失败:', error)
    showNotificationBanner('删除失败：' + error.message, 'error')
  }
}

async function handleAskSubmit(data) {
  try {
    const result = await qaApi.askQuestion(data)
    
    showAskDialog.value = false
    preselectedVideos.value = []
    
    await loadStats()
    await loadRecords()
    
    showNotificationBanner('问题已提交，AI 正在分析中...', 'success')
    
    if (result.data && result.data.record_id) {
      processedTasks.delete(result.data.record_id)
    }
  } catch (error) {
    console.error('提问失败:', error)
    showNotificationBanner('提问失败：' + error.message, 'error')
  }
}

function askWithCurrentVideo() {
  if (!currentVideo.value) {
    ElMessage.warning('请先选择视频')
    return
  }
  
  preselectedVideos.value = [currentVideo.value.path]
  showAskDialog.value = true
}

async function handleExport() {
  try {
    const res = await qaApi.exportRecords('json')
    
    if (!res.data) {
      throw new Error('返回数据为空')
    }
    
    const blob = new Blob([res.data], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `qa_records_${Date.now()}.json`
    link.click()
    window.URL.revokeObjectURL(url)
    showNotificationBanner('导出成功', 'success')
  } catch (error) {
    console.error('导出失败:', error)
    showNotificationBanner('导出失败：' + (error.message || '未知错误'), 'error')
  }
}

function changePage(page) {
  currentPage.value = page
  loadRecords()
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function truncateAnswer(answer, maxLength = 100) {
  if (!answer) return '无回答'
  if (typeof answer !== 'string') return '无回答'
  if (answer.length <= maxLength) return answer
  return answer.substring(0, maxLength) + '...'
}
</script>

<style scoped>
.integrated-qa-container {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

/* 用户名设置栏 */
.user-bar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px 24px;
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-label {
  color: white;
  font-weight: 600;
  font-size: 15px;
}

.username-input {
  flex: 1;
  max-width: 300px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.95);
  transition: all 0.3s;
}

.username-input:focus {
  outline: none;
  background: white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

.username-display {
  color: white;
  font-weight: 600;
  font-size: 15px;
}

.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-profile,
.btn-logout {
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.btn-profile:hover,
.btn-logout:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

/* 通知横幅 */
.notification-banner {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 300px;
  max-width: 600px;
}

.notification-banner.success {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #52c41a;
}

.notification-banner.error {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.notification-icon {
  font-size: 20px;
}

.notification-message {
  font-size: 14px;
  font-weight: 500;
}

.notification-close {
  padding: 4px 8px;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.notification-close:hover {
  opacity: 1;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateX(-50%) translateY(-100%);
  opacity: 0;
}

/* 主布局 */
.main-layout {
  display: grid;
  grid-template-columns: 320px 1fr 600px;
  gap: 20px;
  padding: 20px;
  flex: 1;
  overflow: hidden;
}

/* 视频列表面板 */
.video-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
}

.panel-desc {
  margin: 0;
  font-size: 13px;
  color: #999;
}

.btn-upload {
  align-self: flex-start;
}

.video-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.upload-form {
  padding: 20px 0;
}

.file-info {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 4px;
}

.video-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.video-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #f0f0f0;
  margin-bottom: 12px;
}

.video-item:hover {
  background: #f5f7fa;
  border-color: #d9d9d9;
}

.video-item.active {
  background: #e6f7ff;
  border-color: #1890ff;
}

.video-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f0f2f5;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.3s;
}

.video-icon-wrapper.is-active {
  background: linear-gradient(135deg, #2d73ff 0%, #6d3bf5 100%);
  color: white;
}

.video-info {
  flex: 1;
  overflow: hidden;
}

.video-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.video-path {
  font-size: 11px;
  color: #999;
  font-family: 'Courier New', monospace;
  word-break: break-all;
}

.video-checkbox {
  flex-shrink: 0;
}

.video-stats {
  display: flex;
  gap: 20px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.video-stats .stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-stats .stat-label {
  font-size: 12px;
  color: #999;
}

.video-stats .stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.video-stats .stat-value.highlight {
  color: #1890ff;
}

/* 播放器区域 */
.player-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.player-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.player-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.player-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.player-wrapper {
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 0;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
  outline: none;
}

.empty-player {
  color: #999;
  text-align: center;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.quick-actions {
  display: flex;
  gap: 12px;
  padding: 0 4px;
}

.btn-ask-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  padding: 12px 24px;
  font-weight: 500;
}

.btn-ask-primary:hover {
  opacity: 0.9;
}

/* QA 记录区域 */
.qa-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: calc(100vh - 180px);
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 16px 20px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.stats-bar .stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stats-bar .stat-label {
  font-size: 12px;
  color: #999;
}

.stats-bar .stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.stats-bar .stat-item.success .stat-value {
  color: #52c41a;
}

.stats-bar .stat-item.failure .stat-value {
  color: #ff4d4f;
}

.stats-bar .stat-item.processing .stat-value {
  color: #1890ff;
}

.stats-bar .stat-actions {
  margin-left: auto;
}

.search-bar {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s;
}

.search-input:focus {
  border-color: #1890ff;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.records-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.records-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.record-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  border-left: 4px solid #d9d9d9;
}

.record-card.record-processing {
  border-left-color: #1890ff;
  background: #e6f7ff;
}

.record-card.record-success {
  border-left-color: #52c41a;
}

.record-card.record-failure {
  border-left-color: #ff4d4f;
}

.record-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.record-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.record-time {
  font-size: 12px;
  color: #999;
}

.record-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-success {
  background: #f6ffed;
  color: #52c41a;
}

.status-failure {
  background: #fff2f0;
  color: #ff4d4f;
}

.status-processing {
  background: #e6f7ff;
  color: #1890ff;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: #1890ff;
  border-radius: 50%;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.record-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  padding: 4px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  transition: background 0.3s;
}

.btn-icon:hover {
  background: #f5f5f5;
}

.record-content {
  margin-bottom: 12px;
}

.record-question,
.record-answer {
  margin-bottom: 8px;
  line-height: 1.5;
}

.label {
  font-weight: bold;
  color: #333;
  margin-right: 4px;
}

.text {
  color: #666;
  font-size: 14px;
}

.answer-text {
  display: block;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.processing-text {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
  font-style: italic;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid #e6f7ff;
  border-top-color: #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.record-footer {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.video-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.video-tag {
  padding: 4px 10px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 12px;
  font-size: 11px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.page-info {
  color: #666;
  font-size: 13px;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .main-layout {
    grid-template-columns: 280px 1fr 500px;
  }
}

@media (max-width: 1200px) {
  .main-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
  }
  
  .video-panel {
    max-height: 250px;
  }
  
  .player-section {
    min-height: 400px;
  }
}
</style>
