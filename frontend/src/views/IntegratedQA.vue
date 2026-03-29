<template>
  <div class="integrated-qa-container">
    <div class="qa-bg-glow"></div>

    <!-- 用户信息栏 -->
    <div class="user-bar">
      <div class="user-info">
        <span class="user-label">当前用户：</span>
        <span class="username-display">{{ username }}</span>
      </div>

      <div class="actions">
        <!-- 主题工具 -->
        <div class="theme-tools">
          <button
            class="theme-btn"
            @click="toggleThemeMode"
            :title="themeMode === 'light' ? '切换暗黑模式' : '切换明亮模式'"
          >
            {{ themeMode === 'light' ? '🌙' : '☀️' }}
          </button>
          <button
            class="dot violet"
            :class="{ active: themeColor === 'violet' }"
            @click="setThemeColor('violet')"
            title="紫蓝主题"
          ></button>
          <button
            class="dot teal"
            :class="{ active: themeColor === 'teal' }"
            @click="setThemeColor('teal')"
            title="青绿主题"
          ></button>
          <button
            class="dot rose"
            :class="{ active: themeColor === 'rose' }"
            @click="setThemeColor('rose')"
            title="玫红主题"
          ></button>
        </div>

        <button @click="goToProfile" class="btn-profile">用户信息</button>
      </div>
    </div>

    <!-- 完成通知横幅 -->
    <transition name="slide-down">
      <div v-if="showNotification" class="notification-banner" :class="notificationType">
        <div class="notification-content">
          <span class="notification-icon" v-if="notificationType === 'success'">
            <i class="ri-check-line"></i>
          </span>
          <span class="notification-icon" v-else>
            <i class="ri-alert-line"></i>
          </span>
          <span class="notification-message">{{ notificationMessage }}</span>
        </div>
        <button @click="showNotification = false" class="notification-close">×</button>
      </div>
    </transition>

    <!-- 背景遮罩层 -->
    <div v-if="viewRecordDetail && isDetailExpanded" ref="overlayRef" class="detail-overlay" :class="{ 'closing': isClosing }"></div>
    <!-- 展开状态的悬浮窗口 -->
    <div v-if="viewRecordDetail && isDetailExpanded" ref="popupRef" class="record-detail-panel expanded" :class="{ 'closing': isClosing }">
      <!-- 关闭按钮 -->
      <button @click="toggleDetailExpand" class="floating-close-button-red">
        ×
      </button>
      <!-- 主内容区 -->
      <div class="expanded-main-content">
        <!-- 左侧：回答和视频 -->
        <div class="expanded-left-panel">
          <!-- 回答卡片 -->
          <div class="content-card answer-card">
            <div class="card-header">
              <h2 class="card-title">
                <el-icon><ChatLineRound /></el-icon> AI 回答
              </h2>
            </div>
            <div class="card-body">
              <div v-if="viewRecordDetail.status === 'processing'" class="processing-container">
                <div class="processing-spinner"></div>
                <p class="processing-text">AI 正在分析中，请稍候...</p>
              </div>
              <div v-else class="answer-content" v-html="detailAnswerHtml || '<p>无回答</p>'"></div>
            </div>
          </div>

          <!-- 相关视频卡片 -->
          <div class="content-card videos-card">
            <div class="card-header">
              <h2 class="card-title">
                <el-icon><VideoPlay /></el-icon> 相关视频
              </h2>
            </div>
            <div class="card-body">
              <div class="videos-grid">
                <div
                  v-for="(videoPath, index) in viewRecordDetail.video_paths.filter(vp => getVideoNameByPath(vp))"
                  :key="getOriginalVideoIndex(videoPath)"
                  class="video-item-card"
                >
                  <div class="video-item-icon">
                    <el-icon><VideoPlay /></el-icon>
                  </div>
                  <div class="video-item-header">
                    <span class="video-number-badge">视频{{ getOriginalVideoIndex(videoPath) + 1 }}</span>
                  </div>
                  <div class="video-item-name">{{ getVideoNameByPath(videoPath) }}</div>
                </div>
              </div>
              <div v-if="getDeletedVideoCount() > 0" class="deleted-videos-alert">
                <el-icon><Warning /></el-icon>
                <span>还有 {{ getDeletedVideoCount() }} 个视频已被删除</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：分析过程 -->
        <div class="expanded-right-panel">
          <div class="content-card process-card">
            <div class="card-header">
              <h2 class="card-title">
                <el-icon><Loading /></el-icon> 分析过程
              </h2>
            </div>
            <div class="card-body">
              <div v-if="!viewRecordDetail.model_result?.process_logs && viewRecordDetail.status !== 'processing'" class="empty-process">
                <div class="empty-icon"><i class="ri-bar-chart-line"></i></div>
                <p>暂无分析过程信息</p>
              </div>
              <!-- 进行中任务显示实时流 -->
              <RealtimeStreamProcessFlow 
                v-if="viewRecordDetail.status === 'processing'"
                :task-id="viewRecordDetail.record_id"
                :token="getCurrentToken()"
                @complete="handleStreamComplete"
              />
              <!-- 已完成任务显示完整过程 -->
              <ProcessFlow v-else-if="viewRecordDetail.model_result?.process_logs" :process-logs="viewRecordDetail.model_result.process_logs" />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="main-layout">
      <!-- 左侧：视频列表面板 -->
      <aside class="video-panel">
        <div class="panel-header">
          <h2><el-icon><VideoPlay /></el-icon> 视频选择</h2>
          <p class="panel-desc">选择要分析的视频</p>
          <el-button type="primary" size="small" @click="showUploadDialog = true" class="btn-upload">
            <el-icon><Upload /></el-icon> 上传视频
          </el-button>
        </div>

        <div class="video-list">
          <div
            v-for="video in videoList"
            :key="video.video_id"
            class="video-item"
            :class="{
              active: currentVideo && currentVideo.video_id === video.video_id,
              'related-video': isRelatedVideo(video.video_path)
            }"
            @click="playVideo(video)"
          >
            <div class="video-icon-wrapper" :class="{ 'is-active': currentVideo && currentVideo.video_id === video.video_id }">
              <el-icon><VideoPlay /></el-icon>
            </div>
            <div class="video-info">
              <div class="video-title" :title="video.video_name">
                {{ video.video_name }}
                <span v-if="isShortVideo(video.duration)" class="short-video-tag">🎬 超短</span>
              </div>
              <div class="video-path">{{ video.duration }}</div>
            </div>
            <div class="video-actions">
              <el-checkbox v-model="video.selected" class="video-checkbox" @click.stop></el-checkbox>
              <el-button size="small" @click.stop="handleRenameVideo(video)" title="重命名视频">
                <i class="ri-file-edit-line"></i>
              </el-button>
              <el-button size="small" type="danger" @click.stop="handleDeleteVideo(video)" title="删除视频">
                <i class="ri-delete-bin-line"></i>
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
            </div>
          </div>

          <div class="player-wrapper" ref="playerWrapperRef">
            <VideoPlayer
              v-if="currentVideo"
              :src="getVideoUrl(currentVideo.video_path)"
              :loop="isShortVideo(currentVideo.duration)"
              @loaded="handleVideoLoaded"
              @error="handleVideoError"
              @play="handleVideoPlay"
              class="video-player"
            />
            <div v-else class="empty-player">
              <el-icon class="empty-icon"><Monitor /></el-icon>
              <p>请在左侧选择视频播放</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 右侧：问答区域 -->
      <section class="qa-section">
        <!-- 记录详情视图 - 仅在非展开状态时显示 -->
        <div v-if="viewRecordDetail && !isDetailExpanded" class="record-detail-panel" :class="{ 'closing': isDetailClosing }">
          <div class="detail-header">
            <el-button @click="closeDetailPanel()" size="small" class="back-button">
              <el-icon><ArrowLeft /></el-icon> 返回列表
            </el-button>
            <h2><el-icon><ChatLineRound /></el-icon> 问答详情</h2>
          </div>
          
          <div class="detail-content">
            <!-- 非展开状态的布局 -->
            <div class="collapsed-layout">
              <div class="detail-meta">
                <span class="detail-time">{{ formatTime(viewRecordDetail.timestamp) }}</span>
                <span v-if="viewRecordDetail.status === 'processing'" class="detail-status status-processing">
                  <span class="pulse-dot"></span>进行中
                </span>
                <span v-else-if="viewRecordDetail.status === 'completed' && viewRecordDetail.success !== false" class="detail-status status-success">
                  成功
                </span>
                <span v-else-if="viewRecordDetail.status === 'failed' || viewRecordDetail.success === false" class="detail-status status-failure">
                  失败
                </span>
              </div>

              <div class="detail-question">
                <h3>问题</h3>
                <div class="question-content">{{ viewRecordDetail.question }}</div>
              </div>

              <div class="detail-answer">
                <h3>回答</h3>
                <div class="answer-content">
                  <span v-if="viewRecordDetail.status === 'processing'" class="processing-text">
                    <span class="spinner-small"></span>
                    AI 正在分析中...
                  </span>
                  <div v-else v-html="detailAnswerHtml || '<p>无回答</p>'"></div>
                </div>
              </div>

              <div class="detail-videos">
                <h3>相关视频</h3>
                <div class="video-list">
                  <span
                    v-for="(videoPath, index) in viewRecordDetail.video_paths.filter(vp => getVideoNameByPath(vp))"
                    :key="getOriginalVideoIndex(videoPath)"
                    class="video-tag"
                  >
                    <span class="video-tag-badge">视频{{ getOriginalVideoIndex(videoPath) + 1 }}</span>
                    {{ getVideoNameByPath(videoPath) }}
                  </span>
                </div>
                <div v-if="getDeletedVideoCount() > 0" class="deleted-videos-info">
                  <span class="deleted-count">还有 {{ getDeletedVideoCount() }} 个被删除的视频</span>
                </div>
              </div>

              <div class="detail-actions">
                <el-button @click="deleteRecord(viewRecordDetail.record_id)" type="danger" size="small">
                  <i class="ri-delete-bin-line"></i> 删除记录
                </el-button>
              </div>

              <div class="detail-bottom-action">
                <el-button @click="toggleDetailExpand" type="primary" size="default" class="detail-expand-btn">
                  查看详情信息
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <!-- 提问和记录列表视图 - 仅在未选择记录时显示 -->
        <div v-if="!viewRecordDetail">
          <div class="question-panel">
            <div class="question-card">
              <div class="question-header">
                <h2><el-icon><ChatLineRound /></el-icon> 提问</h2>
                <p class="question-desc">输入问题并选择视频进行分析</p>
              </div>
              <div class="question-input-area">
                <el-input
                  v-model="questionInput"
                  placeholder="请输入您的问题..."
                  class="question-input"
                  type="textarea"
                  :rows="3"
                />
                <div class="question-actions">
                  <span class="selected-count">已选择 {{ selectedVideos.length }} 个视频</span>
                  <el-button type="primary" @click="submitQuestion" :disabled="!questionInput.trim() || selectedVideos.length === 0">
                    提问
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <div class="records-panel">
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

            <div class="records-list" ref="recordsListRef">
              <div v-if="loading" class="loading-state">
                <div class="spinner"></div>
                <p>加载中...</p>
              </div>

              <div v-else-if="records.length === 0" class="empty-state">
                <div class="empty-icon"><i class="ri-chat-3-line"></i></div>
                <p>暂无问答记录</p>
                <p>请在上方提问面板输入问题并选择视频开始问答</p>
              </div>

              <div v-else class="records-grid">
                <div
                  v-for="record in records"
                  :key="record.record_id"
                  class="record-card"
                  :class="{
                    'record-processing': record.status === 'processing',
                    'record-failure': record.status === 'failed' || record.success === false,
                    'record-success': record.status === 'completed' && record.success !== false,
                    'record-active': viewRecordDetail?.record_id === record.record_id
                  }"
                  @click="viewRecord(record)"
                >
                  <div class="record-header">
                    <div class="record-meta">
                      <span class="record-time">{{ formatTime(record.timestamp) }}</span>
                      <span v-if="record.status === 'processing'" class="record-status status-processing">
                        <span class="pulse-dot"></span>进行中
                      </span>
                      <span v-else-if="record.status === 'completed' && record.success !== false" class="record-status status-success">
                        成功
                      </span>
                      <span v-else-if="record.status === 'failed' || record.success === false" class="record-status status-failure">
                        失败
                      </span>
                    </div>
                    <div class="record-actions">
                      <button @click.stop="deleteRecord(record.record_id)" class="btn-icon" title="删除">
                        <i class="ri-delete-bin-line"></i>
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
                        v-for="(videoPath, index) in record.video_paths.filter(vp => getVideoNameByPath(vp))"
                        :key="index"
                        class="video-tag"
                      >
                        {{ getVideoNameByPath(videoPath) }}
                      </span>
                      <span v-if="record.video_paths && record.video_paths.filter(vp => !getVideoNameByPath(vp)).length > 0" class="deleted-tag">
                        +{{ record.video_paths.filter(vp => !getVideoNameByPath(vp)).length }} 个视频已删除
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="totalPages > 1" class="pagination">
              <el-button :disabled="currentPage === 1" @click="changePage(currentPage - 1)" size="small">上一页</el-button>
              <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
              <el-button :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)" size="small">下一页</el-button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 上传对话框 -->
    <el-dialog v-model="showUploadDialog" title="上传视频" width="500px">
      <div class="upload-form">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px">
          <template #default>
            <div style="font-size: 12px; line-height: 1.6;">
              <div>📋 上传限制：</div>
              <div>• 单个视频最大 500MB</div>
              <div>• 每个账户最多 30 个视频</div>
              <div>• 每个账户总存储 2GB</div>
            </div>
          </template>
        </el-alert>
        <el-form label-width="80px">
          <el-form-item label="视频名称">
            <el-input v-model="uploadVideoName" placeholder="请输入视频名称" />
          </el-form-item>
          <el-form-item label="视频文件">
            <el-upload class="upload-demo" action="" :auto-upload="false" :on-change="handleFileChange" :show-file-list="false">
              <el-button size="small" type="primary">选择文件</el-button>
              <template #tip>
                <div class="el-upload__tip">请选择 MP4 格式的视频文件，最大 500MB</div>
              </template>
            </el-upload>
            <div v-if="uploadVideoFile" class="file-info">已选择: {{ uploadVideoFile.name }} ({{ (uploadVideoFile.size / (1024 * 1024)).toFixed(2) }}MB)</div>
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

    <!-- 重命名对话框 -->
    <el-dialog v-model="showRenameDialog" title="重命名视频" width="400px">
      <div class="rename-form">
        <el-form label-width="80px">
          <el-form-item label="当前名称">
            <div class="current-name">{{ currentRenameVideo?.video_name }}</div>
          </el-form-item>
          <el-form-item label="新名称">
            <el-input v-model="newVideoName" placeholder="请输入新的视频名称" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showRenameDialog = false">取消</el-button>
          <el-button type="primary" @click="handleRenameSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog 
      v-model="showDeleteConfirm" 
      :title="deleteConfirmData.title" 
      width="420px"
      align-center
      class="delete-confirm-dialog"
    >
      <div class="delete-confirm-content">
        <div class="delete-icon">
          <i class="ri-alert-circle-line"></i>
        </div>
        <div class="delete-text">
          <p class="delete-message">{{ deleteConfirmData.message }}</p>
          <p class="delete-warning" v-if="deleteConfirmData.warning">{{ deleteConfirmData.warning }}</p>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDeleteConfirm = false">取消</el-button>
          <el-button type="danger" @click="confirmDelete" :loading="deleteConfirmLoading">
            {{ deleteConfirmData.confirmText || '确定删除' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 鼠标点击特效层 -->
    <div class="click-layer">
      <span
        v-for="r in ripples"
        :key="r.id"
        class="click-ripple"
        :style="{ left: r.x + 'px', top: r.y + 'px' }"
      ></span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { marked } from 'marked'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { qaApi } from '../api/qa'
import { videoApi } from '../api/video'
import { getAuthInfo } from '../api/auth'
import { VideoPlay, Monitor, FullScreen, Close, ChatLineRound, Download, Upload, ArrowLeft, ArrowRight, Warning, Loading } from '@element-plus/icons-vue'
import ProcessFlow from '../components/qa/ProcessFlow.vue'
import RealtimeStreamProcessFlow from '../components/qa/RealtimeStreamProcessFlow.vue'
import VideoPlayer from '../components/common/VideoPlayer.vue'

const router = useRouter()
const username = ref('用户')

/* 主题控制 */
const themeMode = ref(localStorage.getItem('theme_mode') || 'light')
const themeColor = ref(localStorage.getItem('theme_color') || 'violet')

function applyTheme() {
  document.documentElement.setAttribute('data-theme-mode', themeMode.value)
  document.documentElement.setAttribute('data-theme-color', themeColor.value)
  localStorage.setItem('theme_mode', themeMode.value)
  localStorage.setItem('theme_color', themeColor.value)
}
function toggleThemeMode() {
  themeMode.value = themeMode.value === 'light' ? 'dark' : 'light'
  applyTheme()
}
function setThemeColor(color) {
  themeColor.value = color
  applyTheme()
}

/* 鼠标点击特效 */
const ripples = ref([])
let rippleId = 1
function handleGlobalClick(e) {
  const id = rippleId++
  ripples.value.push({ id, x: e.clientX, y: e.clientY })
  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== id)
  }, 650)
}

onMounted(() => {
  const authInfo = getAuthInfo()
  if (authInfo.user && authInfo.user.username) username.value = authInfo.user.username

  applyTheme()
  loadVideos()
  loadStats()
  loadRecords()
  startPolling()
  resetZoom()

  window.addEventListener('resize', resetZoom)
  window.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('resize', resetZoom)
  window.removeEventListener('click', handleGlobalClick)
})

function resetZoom() {
  if (document.body && document.body.style) {
    document.body.style.transform = 'scale(1)'
    document.body.style.transformOrigin = '0 0'
  }
}
function goToProfile() {
  router.push('/profile')
}

/* 通知 */
const showNotification = ref(false)
const notificationType = ref('success')
const notificationMessage = ref('')
function showNotificationBanner(message, type = 'success') {
  notificationMessage.value = message
  notificationType.value = type
  showNotification.value = true
  setTimeout(() => { showNotification.value = false }, 5000)
}

/* 视频管理 */
const videoList = ref([])
const currentVideo = ref(null)
const isPlayerFullscreen = ref(false)
const playerWrapperRef = ref(null)
const showUploadDialog = ref(false)
const uploadVideoName = ref('')
const uploadVideoFile = ref(null)
const showRenameDialog = ref(false)
const currentRenameVideo = ref(null)
const newVideoName = ref('')

// 删除确认对话框
const showDeleteConfirm = ref(false)
const deleteConfirmLoading = ref(false)
const deleteConfirmData = reactive({
  title: '删除确认',
  message: '',
  warning: '',
  confirmText: '确定删除',
  type: 'video', // 'video' 或 'record'
  targetId: null
})

async function loadVideos() {
  try {
    const response = await videoApi.getVideoList()
    if (!response || !response.data || !Array.isArray(response.data.videos)) {
      ElMessage.error('视频列表格式错误')
      return
    }
    videoList.value = response.data.videos.map(video => ({ ...video, selected: false }))
    if (videoList.value.length > 0) currentVideo.value = videoList.value[0]
  } catch (error) {
    console.error('加载视频列表失败:', error)
    ElMessage.error('加载视频列表失败')
  }
}
function getVideoUrl(videoPath) {
  // 支持两种格式：
  // 1. 相对路径：uploads/video_id.mp4 -> /api/video/uploads/video_id.mp4
  // 2. 绝对路径：/path/to/backend/uploads/video_id.mp4 -> /api/video/uploads/video_id.mp4
  if (!videoPath) return '';
  
  if (videoPath.startsWith('uploads/')) {
    // 已经是相对路径，直接转换为API路径
    return `/api/video/${videoPath}`
  } else {
    // 绝对路径，提取文件名
    const filename = videoPath.split('/').pop()
    return `/api/video/uploads/${filename}`
  }
}

// 视频播放事件处理 - 增强对超短视频的支持
function handleVideoError(event) {
  console.error('视频加载错误:', event)
  const message = event?.message || event?.error?.message || '未知错误'
  console.error(`视频播放失败: ${message}`)
  ElMessage.error(`视频播放失败: ${message}`)
}

function handleVideoLoaded(event) {
  const duration = event?.duration
  if (duration) {
    const isShortVideo = duration < 10
    if (isShortVideo) {
      console.log(`检测到超短视频 (时长: ${duration.toFixed(2)}秒)`)
    }
  }
}

function handleVideoPlay() {
  console.log('开始播放视频')
}

// 检测是否为超短视频
function isShortVideo(durationStr) {
  if (!durationStr) return false
  // duration格式为 "MM:SS"
  const parts = durationStr.split(':')
  if (parts.length !== 2) return false
  
  const minutes = parseInt(parts[0]) || 0
  const seconds = parseInt(parts[1]) || 0
  const totalSeconds = minutes * 60 + seconds
  
  return totalSeconds < 10
}

function handleFileChange(file) {
  if (file) {
    const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
    
    if (file.raw.size > MAX_FILE_SIZE) {
      ElMessage.error(`文件大小超过限制。最大允许 500MB，当前文件大小：${(file.raw.size / (1024 * 1024)).toFixed(2)}MB`)
      uploadVideoFile.value = null
      return
    }
    
    uploadVideoFile.value = file.raw
    if (!uploadVideoName.value) uploadVideoName.value = file.name.replace(/\.[^/.]+$/, "")
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
async function handleDeleteVideo(video) {
  deleteConfirmData.title = '删除视频'
  deleteConfirmData.message = `确定要删除视频 "${video.video_name}" 吗？`
  deleteConfirmData.warning = '删除后将无法恢复'
  deleteConfirmData.confirmText = '确定删除'
  deleteConfirmData.type = 'video'
  deleteConfirmData.targetId = video.video_id
  deleteConfirmData.video = video
  showDeleteConfirm.value = true
}
function handleRenameVideo(video) {
  currentRenameVideo.value = video
  newVideoName.value = video.video_name
  showRenameDialog.value = true
}
async function handleRenameSubmit() {
  if (!newVideoName.value) {
    ElMessage.warning('请输入新的视频名称')
    return
  }
  try {
    await videoApi.renameVideo(currentRenameVideo.value.video_id, newVideoName.value)
    ElMessage.success('视频重命名成功')
    showRenameDialog.value = false
    await loadVideos()
    if (currentVideo.value && currentVideo.value.video_id === currentRenameVideo.value.video_id) {
      currentVideo.value = videoList.value.find(v => v.video_id === currentRenameVideo.value.video_id) || null
    }
  } catch (error) {
    console.error('视频重命名失败:', error)
    ElMessage.error('视频重命名失败')
  }
}

async function confirmDelete() {
  try {
    deleteConfirmLoading.value = true
    if (deleteConfirmData.type === 'video') {
      await videoApi.deleteVideo(deleteConfirmData.targetId)
      ElMessage.success('视频删除成功')
      await loadVideos()
      if (currentVideo.value && currentVideo.value.video_id === deleteConfirmData.targetId) {
        currentVideo.value = videoList.value.length > 0 ? videoList.value[0] : null
      }
    } else if (deleteConfirmData.type === 'record') {
      await qaApi.deleteRecord(deleteConfirmData.targetId)
      showNotificationBanner('删除成功', 'success')
      await loadStats()
      await loadRecords()
      // 删除成功后关闭问答详情
      closeDetailPanel()
    }
    showDeleteConfirm.value = false
  } catch (error) {
    console.error('删除失败:', error)
    ElMessage.error('删除失败')
  } finally {
    deleteConfirmLoading.value = false
  }
}

function playVideo(video) { currentVideo.value = video }
function togglePlayerFullscreen() { isPlayerFullscreen.value = !isPlayerFullscreen.value }
const selectedVideos = computed(() => videoList.value.filter(v => v.selected))

/* 轮询 */
let pollingInterval = null
const processedTasks = new Set()
function startPolling() {
  pollingInterval = setInterval(async () => {
    await checkProcessingTasks()
  }, 6000)
}
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}
async function refreshTaskProgress(taskId) {
  try {
    const res = await qaApi.getTaskProgress(taskId)
    if (res.data && Array.isArray(res.data.progress)) {
      taskProgressMap[taskId] = res.data.progress
    }
  } catch (error) {
    console.error('获取任务进度失败:', error)
  }
}
async function checkProcessingTasks() {
  try {
    const res = await qaApi.getRecords({ page: 1, limit: 100 })
    if (res.data) {
            const processingRecords = res.data.records.filter(r => r.status === 'processing')
            for (const record of processingRecords) {
                await refreshTaskProgress(record.record_id)
                if (processedTasks.has(record.record_id)) continue
        const statusRes = await qaApi.getRecord(record.record_id)
        const data = statusRes.data
        if (data && (data.status === 'completed' || data.status === 'failed' || data.success !== undefined)) {
          processedTasks.add(record.record_id)
          await loadRecords()
          await loadStats()
          if (data.status === 'completed' || data.success === true) {
            showNotificationBanner(`"${truncateAnswer(data.question, 30)}" 已完成！`, 'success')
          }
        }
      }
    }
  } catch (error) {
    console.error('轮询检查失败:', error)
  }
}

/* QA 记录 */
const loading = ref(false)
const viewRecordDetail = ref(null)
const relatedVideos = ref([])
const searchQuery = ref('')
const filterStatus = ref('all')
const questionInput = ref('')
const isDetailExpanded = ref(false)
const isClosing = ref(false)
const isDetailClosing = ref(false)
const overlayRef = ref(null)
const popupRef = ref(null)

function renderMarkdown(text = '') {
  if (!text) return ''
  const html = marked.parse(text, {
    mangle: false,
    headerIds: false,
    breaks: true
  })
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
}

const detailAnswerHtml = computed(() => {
  const detail = viewRecordDetail.value
  if (!detail || !detail.model_result) return ''
  const raw = detail.model_result.answer || detail.model_result.predicted_answer || ''
  return renderMarkdown(raw)
})

// 获取当前用户token
function getCurrentToken() {
  return localStorage.getItem('access_token') || localStorage.getItem('token')
}

const stats = reactive({ total: 0, success: 0, failure: 0, processing: 0 })
const records = ref([])
const taskProgressMap = reactive({})
const currentProgress = computed(() => {
  if (!viewRecordDetail.value) return []
  const id = viewRecordDetail.value.record_id
  return taskProgressMap[id] || viewRecordDetail.value.model_result?.process_logs?.progress || []
})
const currentPage = ref(1)
const pageSize = 10
const totalPages = ref(1)

async function loadStats() {
  try {
    const res = await qaApi.getSummary()
    stats.total = res.total_records || res.data?.total_records || 0
    stats.success = res.success_count || res.data?.success_count || 0
    stats.failure = res.failure_count || res.data?.failure_count || 0
    stats.processing = res.processing_count || res.data?.processing_count || 0
  } catch (error) {
    console.error('加载统计数据失败:', error)
    stats.total = 0
    stats.success = 0
    stats.failure = 0
    stats.processing = 0
  }
}
async function loadRecords() {
  loading.value = true
  try {
    if (videoList.value.length === 0) await loadVideos()
    const res = await qaApi.getRecords({ page: currentPage.value, limit: pageSize })
    records.value = res.records || res.data?.records || []
    totalPages.value = Math.ceil((res.total || res.data?.total || 0) / pageSize)
  } catch (error) {
    console.error('加载记录失败:', error)
    showNotificationBanner('加载记录失败', 'error')
    records.value = []
    totalPages.value = 1
  } finally {
    loading.value = false
  }
}
function handleSearch() { console.log('搜索:', searchQuery.value) }
function handleFilter() { console.log('筛选状态:', filterStatus.value) }

async function viewRecord(record) {
  if (videoList.value.length === 0) await loadVideos()
  viewRecordDetail.value = record
  relatedVideos.value = record.video_paths || []
  isDetailExpanded.value = false
  if (record.status === 'processing') {
    await refreshTaskProgress(record.record_id)
  }
}

function toggleDetailExpand() {
  if (isDetailExpanded.value) {
    // 关闭时添加淡出动画
    isClosing.value = true
    setTimeout(() => {
      isDetailExpanded.value = false
      isClosing.value = false
    }, 300)
  } else {
    // 打开时直接显示
    isDetailExpanded.value = true
  }
}

function closeDetailPanel() {
  // 添加卡片的退出动画
  isDetailClosing.value = true
  setTimeout(() => {
    viewRecordDetail.value = null
    relatedVideos.value = []
    isDetailExpanded.value = false
    isDetailClosing.value = false
  }, 250)
}
async function deleteRecord(recordId) {
  deleteConfirmData.title = '删除问答记录'
  deleteConfirmData.message = '此操作将永久删除该问答记录'
  deleteConfirmData.warning = '删除后将无法恢复，请谨慎操作'
  deleteConfirmData.confirmText = '确定删除'
  deleteConfirmData.type = 'record'
  deleteConfirmData.targetId = recordId
  showDeleteConfirm.value = true
}
async function submitQuestion() {
  if (!questionInput.value.trim() || selectedVideos.value.length === 0) {
    ElMessage.warning('请输入问题并选择视频')
    return
  }
  try {
    const videoPaths = selectedVideos.value.map(v => v.video_path)
    const result = await qaApi.askQuestion({ question: questionInput.value, video_paths: videoPaths })
    questionInput.value = ''
    await loadStats()
    await loadRecords()
    showNotificationBanner('问题已提交，AI 正在分析中...', 'success')
    // 立即展示新提交任务的实时进度
    if (result.data && result.data.record_id) {
      setTimeout(() => {
        const newRecord = records.value.find(r => r.record_id === result.data.record_id)
        if (newRecord) {
          viewRecordDetail.value = newRecord
          isDetailExpanded.value = true
        }
      }, 300)
    }
  } catch (error) {
    console.error('提问失败:', error)
  }
}

// 处理实时流完成
async function handleStreamComplete(status) {
  console.log('Stream complete, status:', status)
  // 等待一下后端完全存储数据
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // 重新获取记录列表和该任务的最新数据
  await loadStats()
  await loadRecords()
  
  // 更新当前显示的记录（刷新答案和完整过程）
  if (viewRecordDetail.value) {
    const updatedRecord = records.value.find(r => r.record_id === viewRecordDetail.value.record_id)
    if (updatedRecord) {
      viewRecordDetail.value = updatedRecord
    }
  }
}

async function handleExport() {
  try {
    const res = await qaApi.exportRecords('json')
    if (!res.data) throw new Error('返回数据为空')
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
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}
function truncateAnswer(answer, maxLength = 100) {
  if (!answer || typeof answer !== 'string') return '无回答'
  if (answer.length <= maxLength) return answer
  return answer.substring(0, maxLength) + '...'
}
function getVideoIdFromPath(videoPath) {
  try {
    if (!videoPath) return null
    const filename = videoPath.split('/').pop()
    if (!filename) return null
    return filename.split('.')[0]
  } catch (error) {
    console.error('提取视频uid时出错:', error)
    return null
  }
}
function getVideoNameByPath(videoPath) {
  try {
    if (!videoPath) return null
    const videoId = getVideoIdFromPath(videoPath)
    if (videoId) {
      const video = videoList.value.find(v => v.video_id === videoId)
      if (video) return video.video_name
    }
    const video = videoList.value.find(v => v.video_path === videoPath)
    return video ? video.video_name : null
  } catch (error) {
    console.error('获取视频名称时出错:', error)
    return null
  }
}
function isRelatedVideo(videoPath) {
  try {
    if (!videoPath) return false
    if (relatedVideos.value.includes(videoPath)) return true
    const videoId = getVideoIdFromPath(videoPath)
    if (videoId) {
      return relatedVideos.value.some(relatedPath => getVideoIdFromPath(relatedPath) === videoId)
    }
    return false
  } catch (error) {
    console.error('检查视频是否是相关视频时出错:', error)
    return false
  }
}
function getDeletedVideoCount() {
  try {
    if (!viewRecordDetail.value || !viewRecordDetail.value.video_paths) return 0
    return viewRecordDetail.value.video_paths.filter(videoPath => {
      const videoId = getVideoIdFromPath(videoPath)
      const videoExists = videoId ? videoList.value.some(v => v.video_id === videoId) : false
      return !videoExists
    }).length
  } catch (error) {
    console.error('计算被删除视频数量时出错:', error)
    return 0
  }
}

// 获取视频在原始 video_paths 数组中的索引
function getOriginalVideoIndex(videoPath) {
  if (!viewRecordDetail.value || !viewRecordDetail.value.video_paths) return -1
  return viewRecordDetail.value.video_paths.indexOf(videoPath)
}
</script>

<style scoped>
.integrated-qa-container {
  height: 100vh;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  color: var(--text-main);
  background:
    radial-gradient(1200px 600px at 10% 0%, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 50%),
    radial-gradient(1000px 500px at 90% 10%, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 45%),
    linear-gradient(180deg, var(--bg-page) 0%, var(--bg-page-2) 100%);
}

.qa-bg-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(400px 180px at 20% 15%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 70%),
    radial-gradient(360px 160px at 80% 20%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%);
  z-index: 0;
}

* { box-sizing: border-box; }

.user-bar {
  position: relative;
  z-index: 2;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%);
  padding: 16px 24px;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--primary) 28%, transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.user-info { display: flex; align-items: center; gap: 12px; }
.user-label, .username-display { color: white; font-weight: 600; font-size: 15px; }

.actions { display: flex; align-items: center; gap: 10px; }
.theme-tools { display: flex; align-items: center; gap: 8px; }

.theme-btn {
  border: 1px solid rgba(255,255,255,.35);
  background: rgba(255,255,255,.12);
  color: #fff;
  border-radius: 12px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all .22s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.theme-btn:hover { 
  transform: translateY(-2px) scale(1.05);
  background: rgba(255,255,255,.22);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  border-color: rgba(255,255,255,.5);
}

.theme-btn:active {
  transform: translateY(0) scale(1);
}

.dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,.86);
  cursor: pointer;
  transition: transform .2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow .2s ease, filter .2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.dot:hover { 
  transform: scale(1.12);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  filter: brightness(1.1);
}

.dot.active { 
  box-shadow: 0 0 0 4px rgba(255,255,255,.35);
  transform: scale(1.05);
}

.dot.violet { background: linear-gradient(135deg,#6d5bff,#ff4da6); }
.dot.teal { background: linear-gradient(135deg,#06b6d4,#10b981); }
.dot.rose { background: linear-gradient(135deg,#e11d48,#fb7185); }

.btn-profile {
  padding: 10px 20px;
  color: white;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
  backdrop-filter: blur(8px);
  background: linear-gradient(135deg, rgba(255,255,255,.22), rgba(255,255,255,.12));
  border: 1px solid rgba(255,255,255,.4);
  transition: all .22s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.btn-profile::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,.2), transparent);
  opacity: 0;
  transition: opacity .22s ease;
}

.btn-profile:hover { 
  transform: translateY(-3px);
  background: linear-gradient(135deg, rgba(255,255,255,.32), rgba(255,255,255,.22));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border-color: rgba(255,255,255,.6);
}

.btn-profile:hover::before {
  opacity: 1;
}

.btn-profile:active {
  transform: translateY(-1px);
}

.notification-banner {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  padding: 16px 24px;
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 320px;
  max-width: 680px;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  animation: notificationSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.notification-banner.success {
  background: linear-gradient(135deg, rgba(34,197,94,.15), rgba(34,197,94,.08));
  border: 1px solid rgba(34,197,94,.4);
  color: #15803d;
}

.notification-banner.error {
  background: linear-gradient(135deg, rgba(239,68,68,.15), rgba(239,68,68,.08));
  border: 1px solid rgba(239,68,68,.4);
  color: #dc2626;
}

.notification-content { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  flex: 1; 
}

.notification-icon { 
  font-size: 22px;
  animation: notificationIconBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.notification-message { 
  font-size: 14px; 
  font-weight: 500;
  line-height: 1.4;
}

.notification-close {
  padding: 4px 8px;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  opacity: .7;
  transition: all .2s ease;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-close:hover { 
  opacity: 1;
  background: rgba(0, 0, 0, 0.08);
}

@keyframes notificationSlideIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes notificationIconBounce {
  0% { transform: scale(0.3); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.slide-down-enter-active, .slide-down-leave-active { 
  transition: all .35s cubic-bezier(0.34, 1.56, 0.64, 1); 
}

.slide-down-enter-from, .slide-down-leave-to {
  transform: translateX(-50%) translateY(-120px);
  opacity: 0;
}

.main-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 3fr 7fr 4fr;
  gap: 20px;
  padding: 20px;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
}

.video-panel,
.player-card,
.question-card,
.records-panel,
.record-detail-panel {
  border-radius: 16px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border-soft);
  background: var(--bg-card);
  position: relative;
  overflow: hidden;
}
.video-panel::before,
.player-card::before,
.question-card::before,
.records-panel::before,
.record-detail-panel::before {
  content: "";
  position: absolute;
  inset: -2px;
  background: linear-gradient(
    120deg,
    color-mix(in srgb, var(--primary) 26%, transparent),
    color-mix(in srgb, var(--accent) 22%, transparent),
    color-mix(in srgb, var(--success) 18%, transparent)
  );
  filter: blur(14px);
  opacity: .32;
  z-index: 0;
  pointer-events: none;
}
.video-panel > *, .player-card > *, .question-card > *, .records-panel > *, .record-detail-panel > * {
  position: relative;
  z-index: 1;
}

.video-panel { display: flex; flex-direction: column; overflow: hidden; }
.qa-section { display: flex; flex-direction: column; gap: 20px; overflow: hidden; }
.qa-section > div { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.question-panel { flex-shrink: 0; }

.question-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.question-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
  padding-bottom: 16px;
}
.question-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}
.question-desc { margin: 0; font-size: 13px; color: var(--text-muted); }

.question-input-area { display: flex; flex-direction: column; gap: 12px; }
.question-input { width: 100%; }
.question-input :deep(.el-textarea__inner) {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--text-main) 12%, transparent);
  transition: all .2s ease;
}

/* 实时进度面板 */
.question-input :deep(.el-textarea__inner:focus) {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 14%, transparent);
}
.question-actions { display: flex; justify-content: space-between; align-items: center; }
.selected-count { font-size: 13px; color: var(--text-muted); }

.records-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
}
.panel-desc { margin: 0; font-size: 13px; color: var(--text-muted); }
.btn-upload { align-self: flex-start; }

.video-actions { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  flex-shrink: 0; 
}

.video-actions :deep(.el-button--default) {
  border-radius: 8px !important;
  padding: 6px 12px !important;
  border: 1.5px solid color-mix(in srgb, var(--text-main) 15%, transparent) !important;
  background: white !important;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

.video-actions :deep(.el-button--default:hover) {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%) !important;
  color: white !important;
  border: none !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 24%, transparent) !important;
}

.video-actions :deep(.el-button--default:active) {
  transform: translateY(0) !important;
}

.video-actions :deep(.el-button--danger) {
  border-radius: 8px !important;
  padding: 6px 12px !important;
  border: 1.5px solid color-mix(in srgb, #ef4444 35%, transparent) !important;
  background: white !important;
  color: #ef4444 !important;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

.video-actions :deep(.el-button--danger:hover) {
  background: linear-gradient(135deg, #ef4444 0%, #f87171 100%) !important;
  color: white !important;
  border: none !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px color-mix(in srgb, #ef4444 28%, transparent) !important;
}

.video-actions :deep(.el-button--danger:active) {
  transform: translateY(0) !important;
}
.upload-form { padding: 20px 0; }

.file-info,
.current-name {
  margin-top: 12px;
  font-size: 14px;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--bg-card) 70%, #eef2ff 30%);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
}

.video-list { flex: 1; overflow-y: auto; padding: 16px; }
.video-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
  margin-bottom: 12px;
  transition: all .22s ease;
  background: color-mix(in srgb, var(--bg-card) 88%, transparent);
}
.video-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--primary) 12%, transparent);
}
.video-item.active {
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  border-color: var(--primary);
}
.video-item.related-video {
  border: 2px solid var(--success);
  background: color-mix(in srgb, var(--success) 12%, transparent);
}

.video-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--text-main) 8%, transparent);
  color: color-mix(in srgb, var(--text-main) 70%, #fff 30%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.video-icon-wrapper.is-active {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: #fff;
}

.video-info { flex: 1; overflow: hidden; }
.video-title {
  font-size: 14px;
  color: var(--text-main);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.video-path {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'Fira Code', 'Courier New', monospace;
  word-break: break-all;
}
.video-checkbox { 
  flex-shrink: 0;
}

.video-checkbox :deep(.el-checkbox__input) {
  border-radius: 6px !important;
  width: 24px !important;
  height: 24px !important;
}

.video-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%) !important;
  border-color: var(--primary) !important;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 32%, transparent) !important;
}

.video-checkbox :deep(.el-checkbox__inner) {
  width: 20px !important;
  height: 20px !important;
  border-radius: 4px !important;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

.video-checkbox :deep(.el-checkbox__inner::after) {
  box-sizing: content-box;
  width: 6px !important;
  height: 10px !important;
  left: ８px !important;
  top: 8px !important;
  border-width: 2px !important;
  border-color: white;
  border-right-width: 2.5px !important;
  border-bottom-width: 2.5px !important;
}

.video-checkbox :deep(.el-checkbox:hover .el-checkbox__input.is-checked .el-checkbox__inner) {
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 36%, transparent) !important;
  transform: scale(1.05);
}

.video-stats {
  display: flex;
  gap: 20px;
  padding: 16px 20px;
  border-top: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
  background: color-mix(in srgb, var(--bg-card) 70%, #eef2ff 30%);
}
.video-stats .stat-item { display: flex; flex-direction: column; gap: 4px; }
.video-stats .stat-label { font-size: 12px; color: var(--text-muted); }
.video-stats .stat-value { font-size: 20px; font-weight: bold; color: var(--text-main); }
.video-stats .stat-value.highlight { color: var(--primary); }

.player-section { display: flex; flex-direction: column; gap: 16px; overflow: hidden; flex: 1; }
.player-card { display: flex; flex-direction: column; overflow: hidden; flex: 1; min-height: 0; }

.player-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
}
.player-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-main);
}
.player-wrapper {
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
.video-player { width: 100%; height: 100%; object-fit: contain; outline: none; }
.video-player.short-video-player {
  /* 超短视频特殊处理 */
  animation: short-video-pulse 2s ease-in-out infinite;
}
@keyframes short-video-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.95; }
}
.short-video-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8c42 100%);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  animation: pulse-badge 1.5s ease-in-out infinite;
}
@keyframes pulse-badge {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
}
.empty-player { color: #999; text-align: center; }
.empty-icon { font-size: 56px; margin-bottom: 16px; opacity: .5; }

.stats-bar {
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 16px 20px;
  background: color-mix(in srgb, var(--bg-card) 75%, #eef2ff 25%);
  border-bottom: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
}
.stats-bar .stat-item { display: flex; flex-direction: column; gap: 4px; }
.stats-bar .stat-label { font-size: 12px; color: var(--text-muted); }
.stats-bar .stat-value { font-size: 20px; font-weight: bold; color: var(--text-main); letter-spacing: .3px; }
.stats-bar .stat-item.success .stat-value { color: #16a34a; }
.stats-bar .stat-item.failure .stat-value { color: #dc2626; }
.stats-bar .stat-item.processing .stat-value { color: var(--primary); }
.stats-bar .stat-actions { 
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-actions :deep(.el-button--default) {
  border-radius: 10px !important;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%) !important;
  color: white !important;
  border: none !important;
  padding: 8px 16px !important;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 28%, transparent) !important;
}

.stat-actions :deep(.el-button--default:hover) {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 32%, transparent) !important;
}

.stat-actions :deep(.el-button--default:active) {
  transform: translateY(0) !important;
}

.records-list { flex: 1; overflow-y: auto; padding: 20px; }
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 40px;
  color: var(--text-muted);
  animation: emptyStateFadeIn 0.35s ease;
}

@keyframes emptyStateFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid color-mix(in srgb, var(--text-main) 10%, transparent);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  animation: spin 1.2s linear infinite;
}

@keyframes spin { 
  0% { transform: rotate(0deg); } 
  100% { transform: rotate(360deg); } 
}

.loading-state p {
  font-size: 14px;
  margin: 8px 0 0 0;
}

.empty-state .empty-icon { 
  font-size: 64px; 
  margin-bottom: 16px;
  opacity: 0.6;
  animation: emptyIconFloat 3s ease-in-out infinite;
}

@keyframes emptyIconFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
}

.empty-state p {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
}

.empty-state p:first-of-type {
  font-size: 16px;
  color: var(--text-main);
  font-weight: 600;
}

.empty-state p:last-of-type {
  font-size: 13px;
  margin-top: 4px;
  opacity: 0.8;
}

.records-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); 
  gap: 18px;
  animation: recordsGridFadeIn 0.3s ease;
}

@keyframes recordsGridFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.record-card {
  background: color-mix(in srgb, var(--bg-card) 98%, transparent);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 2px 12px color-mix(in srgb, var(--text-main) 8%, transparent);
  border-left: 5px solid color-mix(in srgb, var(--text-main) 18%, transparent);
  transition: all .28s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.record-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--primary) 0%, transparent),
    color-mix(in srgb, var(--accent) 0%, transparent)
  );
  opacity: 0;
  transition: opacity .28s ease;
  pointer-events: none;
}

.record-card:hover {
  box-shadow: 0 16px 40px color-mix(in srgb, var(--primary) 20%, transparent);
  transform: translateY(-6px);
  border-left-width: 6px;
}

.record-card:hover::before {
  opacity: 0.03;
}

.record-card.record-active {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--primary) 12%, transparent),
    color-mix(in srgb, var(--accent) 8%, transparent)
  );
  box-shadow: 0 12px 32px color-mix(in srgb, var(--primary) 24%, transparent);
  border-left-width: 6px;
  border-left-color: var(--primary);
  animation: cardPulseIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.record-card.record-active::before {
  opacity: 0.06;
}

.record-card.record-processing {
  border-left-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
}

.record-card.record-processing:hover {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
}

.record-card.record-success { 
  border-left-color: var(--success);
}

.record-card.record-success:hover {
  background: color-mix(in srgb, var(--success) 6%, transparent);
}

.record-card.record-failure { 
  border-left-color: var(--danger);
}

.record-card.record-failure:hover {
  background: color-mix(in srgb, var(--danger) 6%, transparent);
}

.record-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.record-meta { display: flex; align-items: center; gap: 8px; }
.record-time { font-size: 12px; color: var(--text-muted); }

.record-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.status-success { background: rgba(34,197,94,.14); color: #15803d; }
.status-failure { background: rgba(239,68,68,.14); color: #dc2626; }
.status-processing { background: color-mix(in srgb, var(--primary) 18%, transparent); color: var(--primary); }

.pulse-dot {
  width: 6px;
  height: 6px;
  background: var(--primary);
  border-radius: 50%;
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .5; transform: scale(1.2); }
}

.record-actions { 
  display: flex; 
  gap: 6px; 
  align-items: center;
}

.btn-icon {
  padding: 6px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  font-size: 16px;
  transition: all .2s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.btn-icon:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
  opacity: 1;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

.record-content { 
  margin-bottom: 12px;
  line-height: 1.6;
}

.record-question, .record-answer { 
  margin-bottom: 10px; 
  line-height: 1.5;
}

.label { 
  font-weight: 600;
  color: var(--text-main); 
  margin-right: 6px;
  display: inline;
  min-width: 20px;
}

.text { 
  color: color-mix(in srgb, var(--text-main) 72%, #fff 28%); 
  font-size: 14px;
  word-break: break-word;
}

.record-question .text {
  color: var(--text-main);
  font-weight: 500;
}

.answer-text { 
  display: block; 
  max-height: 64px; 
  overflow: hidden; 
  text-overflow: ellipsis;
  line-height: 1.5;
  word-break: break-word;
}
.processing-text { display: flex; align-items: center; gap: 8px; color: var(--primary); font-style: italic; }
.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid color-mix(in srgb, var(--primary) 18%, transparent);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.record-footer {
  border-top: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
  padding-top: 12px;
}
.video-tags { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 8px;
}

.video-tag {
  padding: 6px 12px;
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--primary) 14%, transparent),
    color-mix(in srgb, var(--primary) 8%, transparent)
  );
  color: var(--primary);
  border-radius: 14px;
  font-size: 12px;
  border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent);
  transition: all .2s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.video-tag:hover {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--primary) 20%, transparent),
    color-mix(in srgb, var(--primary) 14%, transparent)
  );
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 16%, transparent);
}

.deleted-tag {
  padding: 6px 12px;
  background: linear-gradient(135deg, 
    rgba(239,68,68,.14),
    rgba(239,68,68,.08)
  );
  color: #dc2626;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(239,68,68,.28);
  transition: all .2s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.deleted-tag:hover {
  background: linear-gradient(135deg, 
    rgba(239,68,68,.2),
    rgba(239,68,68,.14)
  );
  border-color: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239,68,68,.16);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 24px 20px;
  border-top: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--primary) 6%, transparent),
    color-mix(in srgb, var(--accent) 3%, transparent)
  );
}

.page-info { 
  color: var(--text-muted); 
  font-size: 14px;
  font-weight: 600;
  min-width: 160px;
  text-align: center;
  letter-spacing: 0.3px;
}

:deep(.pagination .el-button) {
  border-radius: 10px !important;
  padding: 8px 20px !important;
  font-weight: 600;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
}

:deep(.pagination .el-button--default) {
  color: var(--text-main) !important;
  background: white !important;
  border: 1px solid color-mix(in srgb, var(--text-main) 12%, transparent) !important;
}

:deep(.pagination .el-button--default:hover:not(:disabled)) {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%) !important;
  color: white !important;
  border: none !important;
  transform: translateY(-3px) !important;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 28%, transparent) !important;
}

:deep(.pagination .el-button--default:active:not(:disabled)) {
  transform: translateY(-1px) !important;
}

:deep(.pagination .el-button.is-disabled) {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}

:deep(.pagination .el-button.is-disabled:hover) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  background: white !important;
  border: 1px solid color-mix(in srgb, var(--text-main) 12%, transparent) !important;
}

.record-detail-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  transition: all 0.3s ease;
  position: relative;
  z-index: 10;
  animation: panelSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.record-detail-panel.closing {
  animation: panelSlideOut 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.record-detail-panel.expanded {
  position: fixed;
  top: 5%;
  left: 5%;
  width: 90%;
  height: 90vh;
  max-width: none;
  z-index: 1000;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: popupFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  transform-origin: center;
}

.detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  z-index: 999;
  animation: overlayFadeIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.record-detail-panel.expanded.closing {
  animation: popupFadeOut 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.detail-overlay.closing {
  animation: overlayFadeOut 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes overlayFadeIn {
  0% {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  100% {
    opacity: 1;
    backdrop-filter: blur(10px);
  }
}

@keyframes popupFadeIn {
  0% {
    opacity: 0;
    transform: scale(0.85) translateY(30px);
    filter: blur(4px);
  }
  50% {
    filter: blur(2px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0px);
  }
}

@keyframes popupFadeOut {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0px);
  }
  50% {
    filter: blur(2px);
  }
  100% {
    opacity: 0;
    transform: scale(0.85) translateY(30px);
    filter: blur(4px);
  }
}

@keyframes overlayFadeOut {
  0% {
    opacity: 1;
    backdrop-filter: blur(10px);
  }
  100% {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
}

@keyframes cardPulseIn {
  0% {
    background: color-mix(in srgb, var(--bg-card) 98%, transparent);
    box-shadow: 0 2px 12px color-mix(in srgb, var(--text-main) 8%, transparent);
    border-left-width: 5px;
  }
  50% {
    box-shadow: 0 16px 40px color-mix(in srgb, var(--primary) 28%, transparent);
  }
  100% {
    background: linear-gradient(135deg, 
      color-mix(in srgb, var(--primary) 12%, transparent),
      color-mix(in srgb, var(--accent) 8%, transparent)
    );
    box-shadow: 0 12px 32px color-mix(in srgb, var(--primary) 24%, transparent);
    border-left-width: 6px;
  }
}

@keyframes cardPulseOut {
  0% {
    background: linear-gradient(135deg, 
      color-mix(in srgb, var(--primary) 12%, transparent),
      color-mix(in srgb, var(--accent) 8%, transparent)
    );
    box-shadow: 0 12px 32px color-mix(in srgb, var(--primary) 24%, transparent);
    border-left-width: 6px;
  }
  50% {
    box-shadow: 0 16px 40px color-mix(in srgb, var(--primary) 28%, transparent);
  }
  100% {
    background: color-mix(in srgb, var(--bg-card) 98%, transparent);
    box-shadow: 0 2px 12px color-mix(in srgb, var(--text-main) 8%, transparent);
    border-left-width: 5px;
  }
}

@keyframes panelSlideIn {
  0% {
    opacity: 0;
    transform: translateX(30px);
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
    filter: blur(0px);
  }
}

@keyframes panelSlideOut {
  0% {
    opacity: 1;
    transform: translateX(0);
    filter: blur(0px);
  }
  100% {
    opacity: 0;
    transform: translateX(30px);
    filter: blur(4px);
  }
}

.record-detail-panel.expanded::before {
  opacity: 0.2;
  filter: blur(10px);
}

.expand-button {
  flex-shrink: 0;
}

.floating-expand-button {
  position: fixed !important;
  left: calc(100% - 410px) !important;
  top: 50% !important;
  transform: translateY(-50%);
  z-index: 50 !important;
  width: 50px !important;
  height: 50px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%) !important;
  border: none !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
}

.floating-expand-button:hover {
  transform: translateY(-50%) scale(1.1) !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
}

.floating-expand-button svg {
  font-size: 24px;
}



.detail-header {
  padding: 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
  display: flex;
  align-items: center;
  gap: 16px;
  background: color-mix(in srgb, var(--bg-card) 72%, #eef2ff 28%);
  position: relative;
  z-index: 101;
}

.expanded-header {
  padding: 20px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  background: white;
  position: relative;
  z-index: 9999;
  min-height: 60px;
  border-bottom: 1px solid #eee;
}

.expanded-header .expand-button {
  border-radius: 8px;
  font-weight: 500;
  background: white;
  border: 1px solid #ddd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.expanded-header .expand-button:hover {
  background: #f5f5f5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.floating-close-button {
  position: fixed !important;
  left: 20px !important;
  top: 50% !important;
  transform: translateY(-50%);
  z-index: 10000 !important;
  width: 50px !important;
  height: 50px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%) !important;
  border: none !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
}

.floating-close-button:hover {
  transform: translateY(-50%) scale(1.1) !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
}

.floating-close-button svg {
  font-size: 24px;
}

.floating-close-button-red {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 101;
  width: 36px;
  height: 36px;
  border: none;
  background: #ff4d4f;
  color: white;
  border-radius: 50%;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4);
  transition: all 0.3s ease;
}

.floating-close-button-red:hover {
  background: #ff7875;
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(255, 77, 79, 0.5);
}

.back-button {
  flex-shrink: 0 !important;
  border-radius: 10px !important;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%) !important;
  color: white !important;
  border: none !important;
  padding: 10px 18px !important;
  font-weight: 600;
  transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  box-shadow: 0 4px 15px color-mix(in srgb, var(--primary) 32%, transparent) !important;
}

.back-button:hover:not(:disabled) {
  transform: translateY(-3px) !important;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--primary) 36%, transparent) !important;
}

.back-button:active:not(:disabled) {
  transform: translateY(-1px) !important;
}
.detail-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.detail-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.collapsed-layout {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding-bottom: 90px;
}
.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
}
.detail-time { font-size: 14px; color: var(--text-muted); }
.detail-status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-question, .detail-answer, .detail-videos { display: flex; flex-direction: column; gap: 8px; }
.detail-question h3, .detail-answer h3, .detail-videos h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-main);
  font-weight: 600;
}
.question-content, .answer-content {
  padding: 16px;
  background: color-mix(in srgb, var(--bg-card) 72%, #eef2ff 28%);
  border-radius: 8px;
  line-height: 1.6;
  color: var(--text-main);
  white-space: normal;
  word-break: break-word;
}
.detail-videos .video-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.deleted-videos-info { margin-top: 8px; }
.deleted-count { color: var(--danger); font-size: 12px; font-weight: 500; }

.detail-actions {
  padding-top: 16px;
  border-top: 1px solid color-mix(in srgb, var(--text-main) 10%, transparent);
  display: flex;
  gap: 12px;
}

/* Element Plus 主按钮 */
:deep(.el-button--primary) {
  background: linear-gradient(135deg, var(--primary), var(--accent)) !important;
  border: none !important;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--primary) 24%, transparent);
  animation: glowPulse 2.2s ease-in-out infinite;
}
:deep(.el-button--primary:hover) {
  transform: translateY(-1px);
  opacity: .95;
}
@keyframes glowPulse {
  0%,100% { box-shadow: 0 8px 18px color-mix(in srgb, var(--primary) 24%, transparent); }
  50% { box-shadow: 0 10px 26px color-mix(in srgb, var(--accent) 30%, transparent); }
}

.video-list::-webkit-scrollbar,
.records-list::-webkit-scrollbar,
.detail-content::-webkit-scrollbar {
  width: 8px;
}
.video-list::-webkit-scrollbar-thumb,
.records-list::-webkit-scrollbar-thumb,
.detail-content::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, color-mix(in srgb, var(--primary) 42%, #fff), color-mix(in srgb, var(--primary-2) 40%, #fff));
  border-radius: 999px;
}
.video-list::-webkit-scrollbar-track,
.records-list::-webkit-scrollbar-track,
.detail-content::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  border-radius: 999px;
}

/* 展开布局样式 */
.expanded-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  position: relative;
}

.expanded-layout > .expand-close-button {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 102;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.expanded-layout > .expand-close-button:hover {
  background: #f5f5f5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 顶部信息栏 */
.expanded-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%);
  color: white;
  border-bottom: 1px solid var(--border-soft);
}

.expanded-title-section {
  flex: 1;
  margin-right: 20px;
}

.expanded-main-title {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-word;
}

.expanded-meta-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  opacity: 0.9;
}

.expanded-timestamp {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 13px;
}

.status-indicator.status-processing {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.status-indicator.status-success {
  background: rgba(34, 197, 94, 0.2);
  color: #dcfce7;
}

.status-indicator.status-failure {
  background: rgba(239, 68, 68, 0.2);
  color: #fee2e2;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.expanded-actions {
  display: flex;
  gap: 10px;
}

.action-button {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-button:hover {
  transform: translateY(-2px);
}

.delete-button {
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* 主内容区 */
.expanded-main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 3fr 7fr;
  gap: 20px;
  padding: 24px;
  background: var(--bg-page);
  min-height: 0;
}

/* 面板 */
.expanded-left-panel,
.expanded-right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  max-height: 100%;
  min-height: 0;
}

/* 内容卡片 */
.content-card {
  background: var(--bg-card);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-soft);
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.content-card .card-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.content-card:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--bg-card) 80%, var(--primary) 10%);
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-body {
  padding: 20px;
}

/* 处理中状态 */
.processing-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.processing-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.processing-text {
  font-size: 14px;
  font-style: italic;
  color: var(--text-muted);
}

/* 回答内容 */
.answer-content {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-main);
  white-space: normal;
  word-break: break-word;
}

.detail-bottom-action {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 0 0 0;
  margin-top: auto;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--bg-card) 85%, #eef2ff 15%));
}

.detail-expand-btn {
  width: 100%;
  padding: 14px 0;
  font-size: 16px;
}

.answer-content :deep(p) {
  margin: 0 0 10px 0;
}

.answer-content :deep(ul),
.answer-content :deep(ol) {
  margin: 0 0 10px 18px;
  padding-left: 18px;
}

.answer-content :deep(li) {
  margin-bottom: 6px;
}

.answer-content :deep(code) {
  background: color-mix(in srgb, var(--text-main) 10%, transparent);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: 'Fira Code', 'Consolas', monospace;
}

/* 视频网格 */
.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.video-item-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: color-mix(in srgb, var(--bg-card) 70%, var(--primary) 5%);
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  transition: all 0.2s ease;
  text-align: center;
}

.video-item-card:hover {
  background: color-mix(in srgb, var(--bg-card) 60%, var(--primary) 10%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.video-item-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 12px;
}

.video-item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
  line-height: 1.4;
}

.video-item-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  width: 100%;
  justify-content: center;
}

.video-number-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, var(--accent)));
  color: white;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  white-space: nowrap;
}

.video-tag-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  background: var(--primary);
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  margin-right: 4px;
  flex-shrink: 0;
  white-space: nowrap;
}

/* 删除视频警告 */
.deleted-videos-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  font-size: 13px;
  color: #dc2626;
  font-weight: 500;
}

/* 空过程状态 */
.empty-process {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-process p {
  margin: 0;
  font-size: 14px;
}

/* 过程时间线 */
.process-timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.process-step {
  display: flex;
  gap: 16px;
  position: relative;
}

.process-step::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 40px;
  bottom: -20px;
  width: 2px;
  background: var(--border-soft);
  z-index: 0;
}

.process-step:last-child::before {
  display: none;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 2px solid var(--border-soft);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
  z-index: 1;
  transition: all 0.3s ease;
}

.process-step.step-completed .step-number {
  background: var(--success);
  border-color: var(--success);
  color: white;
}

.process-step.step-processing .step-number {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
  animation: pulse 1.5s ease-in-out infinite;
}

.step-content {
  flex: 1;
  background: color-mix(in srgb, var(--bg-card) 80%, transparent);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--border-soft);
  position: relative;
  z-index: 1;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.step-stage {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.step-time {
  font-size: 12px;
  color: var(--text-muted);
}

.step-message {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-main);
  margin-bottom: 12px;
}

.step-data {
  margin-top: 12px;
  border-top: 1px solid var(--border-soft);
  padding-top: 12px;
}

.step-data pre {
  margin: 0;
  font-size: 12px;
  background: color-mix(in srgb, var(--primary) 5%, transparent);
  color: var(--text-main);
  overflow-x: auto;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-soft);
  line-height: 1.4;
}

/* 滚动条样式 */
.expanded-left-panel::-webkit-scrollbar,
.expanded-right-panel::-webkit-scrollbar {
  width: 6px;
}

.expanded-left-panel::-webkit-scrollbar-thumb,
.expanded-right-panel::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--primary), var(--accent));
  border-radius: 3px;
}

.expanded-left-panel::-webkit-scrollbar-track,
.expanded-right-panel::-webkit-scrollbar-track {
  background: var(--bg-page);
  border-radius: 3px;
}

/* 分析过程 */
.detail-process {
  margin-top: 12px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  padding: 12px;
  background: var(--bg-card);
  max-height: 250px;
  overflow: auto;
}
.detail-process h3 {
  margin-bottom: 8px;
  color: var(--text-main);
}
.process-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.process-item {
  border-bottom: 1px solid var(--border-soft);
  padding: 6px 0;
}
.process-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.process-message {
  font-size: 13px;
  color: var(--text-main);
  margin-bottom: 4px;
}
.process-data pre {
  margin: 0;
  font-size: 11px;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--text-main);
  overflow-x: auto;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-soft);
}

/* 鼠标点击特效 */
.click-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}
.click-ripple {
  position: absolute;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  margin-top: -7px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--accent) 70%, #fff 30%);
  box-shadow: 0 0 18px color-mix(in srgb, var(--primary) 45%, transparent);
  animation: ripple .65s ease-out forwards;
}
@keyframes ripple {
  0% { transform: scale(.4); opacity: .9; }
  100% { transform: scale(5.5); opacity: 0; }
}

@media (max-width: 1400px) {
  .main-layout { grid-template-columns: 2.5fr 6fr 4fr; }
}
@media (max-width: 1200px) {
  .main-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
    padding: 12px;
  }
  .video-panel { max-height: 250px; }
  .player-section { min-height: 400px; }
  .records-panel { max-height: none; min-height: 400px; }
  .record-detail-panel { min-height: 400px; }
}
@media (max-width: 768px) {
  .main-layout { padding: 10px; gap: 10px; }
  .question-card { padding: 16px; }
  .player-section, .records-panel, .record-detail-panel { min-height: 300px; }
  .detail-content { padding: 16px; }
}

/* 删除确认对话框 */
.delete-confirm-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%);
  border-bottom: none;
  padding: 20px;
}

.delete-confirm-dialog :deep(.el-dialog__title) {
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.delete-confirm-dialog :deep(.el-dialog__close) {
  color: rgba(255, 255, 255, 0.6);
}

.delete-confirm-dialog :deep(.el-dialog__close:hover) {
  color: white;
}

.delete-confirm-content {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 24px 0;
}

.delete-icon {
  font-size: 48px;
  color: var(--danger);
  flex-shrink: 0;
  animation: deleteIconPulse 2s infinite;
}

@keyframes deleteIconPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.delete-text {
  flex: 1;
}

.delete-message {
  margin: 0 0 8px 0;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.delete-warning {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  border-left: 2px solid var(--danger);
  border-radius: 4px;
}

.delete-confirm-dialog :deep(.el-dialog__footer) {
  border-top: 1px solid var(--border-soft);
  padding: 16px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.delete-confirm-dialog :deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.delete-confirm-dialog :deep(.el-button--default) {
  border-color: var(--border-soft);
  color: var(--text-muted);
}

.delete-confirm-dialog :deep(.el-button--default:hover) {
  border-color: var(--primary);
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 5%, transparent);
}

.delete-confirm-dialog :deep(.el-button--danger) {
  background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%);
  border: none;
  color: white;
}

.delete-confirm-dialog :deep(.el-button--danger:hover) {
  box-shadow: 0 4px 16px color-mix(in srgb, var(--danger) 40%, transparent);
  transform: translateY(-2px);
}

</style>