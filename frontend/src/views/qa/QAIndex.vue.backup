<template>
  <div class="qa-container">
    <!-- 用户名设置栏 -->
    <div class="user-bar">
      <div class="user-info">
        <label class="user-label">当前用户：</label>
        <input 
          v-model="currentUsername" 
          @change="saveUsername"
          placeholder="输入用户名" 
          class="username-input"
        />
        <button @click="saveUsername" class="btn-save">保存</button>
      </div>
      <div class="user-hint">💡 在用户模块完成前，您可以自由设置用户名（无需登录）</div>
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
        <button @click="handleExport" class="btn-export">导出记录</button>
        <button @click="showAskDialog = true" class="btn-ask">
          <span class="icon-plus"></span> 新建问答
        </button>
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
    <div class="records-list">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="records.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <p>暂无问答记录</p>
        <button @click="showAskDialog = true" class="btn-ask-primary">
          开始第一个问答
        </button>
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
      <button 
        :disabled="currentPage === 1" 
        @click="changePage(currentPage - 1)"
        class="page-btn"
      >
        上一页
      </button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button 
        :disabled="currentPage === totalPages" 
        @click="changePage(currentPage + 1)"
        class="page-btn"
      >
        下一页
      </button>
    </div>

    <!-- 提问对话框 -->
    <AskDialog 
      v-if="showAskDialog" 
      :username="currentUsername"
      @close="showAskDialog = false"
      @submit="handleAskSubmit"
    />

    <!-- 详情对话框 -->
    <RecordDetailDialog
      v-if="showDetailDialog"
      :record="selectedRecord"
      @close="showDetailDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { qaApi } from '../../api/qa'
import AskDialog from '../../components/qa/AskDialog.vue'
import RecordDetailDialog from '../../components/qa/RecordDetailDialog.vue'

// 用户名管理
const currentUsername = ref('default_user')

// 加载保存的用户名
onMounted(() => {
  const savedUsername = localStorage.getItem('qa_username')
  if (savedUsername) {
    currentUsername.value = savedUsername
  }
  // 启动轮询
  startPolling()
})

// 保存用户名
function saveUsername() {
  if (!currentUsername.value.trim()) {
    currentUsername.value = 'default_user'
  }
  localStorage.setItem('qa_username', currentUsername.value.trim())
  // 重新加载数据
  loadStats()
  loadRecords()
}

// 通知状态
const showNotification = ref(false)
const notificationType = ref('success')
const notificationMessage = ref('')

// 显示通知
function showNotificationBanner(message, type = 'success') {
  notificationMessage.value = message
  notificationType.value = type
  showNotification.value = true
  
  // 5 秒后自动隐藏
  setTimeout(() => {
    showNotification.value = false
  }, 5000)
}

// 轮询机制
let pollingInterval = null
const processedTasks = new Set()

function startPolling() {
  // 每 3 秒检查一次进行中的任务
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
    const res = await qaApi.getRecords({ page: 1, limit: 100, username: currentUsername.value })
    if (res.data) {
      const processingRecords = res.data.records.filter(r => r.status === 'processing')
      
      for (const record of processingRecords) {
        // 检查是否已经处理过这个任务
        if (processedTasks.has(record.record_id)) {
          continue
        }
        
        // 获取最新状态
        const statusRes = await qaApi.getRecord(record.record_id)
        const data = statusRes.data
        
        // 根据 status 字段判断是否完成
        if (data && (data.status === 'completed' || data.status === 'failed' || data.success !== undefined)) {
          // 任务已完成或失败
          processedTasks.add(record.record_id)
          
          // 刷新列表
          await loadRecords()
          await loadStats()
          
          // 显示通知
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

// 状态管理
const loading = ref(false)
const showAskDialog = ref(false)
const showDetailDialog = ref(false)
const selectedRecord = ref(null)
const searchQuery = ref('')
const filterStatus = ref('all')

// 统计数据
const stats = reactive({
  total: 0,
  success: 0,
  failure: 0,
  processing: 0
})

// 问答记录
const records = ref([])
const currentPage = ref(1)
const pageSize = 10
const totalPages = ref(1)

// 加载数据
onMounted(async () => {
  await loadStats()
  await loadRecords()
})

// 加载统计数据
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
    showNotificationBanner('加载统计数据失败', 'error')
  }
}

// 加载记录列表
async function loadRecords() {
  loading.value = true
  try {
    const res = await qaApi.getRecords({
      page: currentPage.value,
      limit: pageSize,
      username: currentUsername.value
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

// 处理搜索
function handleSearch() {
  // TODO: 实现前端搜索或后端搜索
  console.log('搜索:', searchQuery.value)
}

// 处理筛选
function handleFilter() {
  console.log('筛选状态:', filterStatus.value)
  // TODO: 实现筛选逻辑
}

// 查看记录详情
function viewRecord(record) {
  selectedRecord.value = record
  showDetailDialog.value = true
}

// 删除记录
async function deleteRecord(recordId) {
  // 使用 confirm 确认删除（这是浏览器原生 API，保留）
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

// 提交问题
async function handleAskSubmit(data) {
  console.log('[DEBUG] 提交问题:', data)
  console.log('[DEBUG] currentUsername:', currentUsername.value)
  
  try {
    const result = await qaApi.askQuestion(data)
    
    // 关闭对话框
    showAskDialog.value = false
    
    // 刷新列表和统计
    await loadStats()
    await loadRecords()
    
    // 显示提交通知
    showNotificationBanner('问题已提交，AI 正在分析中...', 'success')
    
    // 标记这个任务为未处理
    if (result.data && result.data.record_id) {
      processedTasks.delete(result.data.record_id)
    }
  } catch (error) {
    console.error('提问失败:', error)
    showNotificationBanner('提问失败：' + error.message, 'error')
  }
}

// 导出记录
async function handleExport() {
  try {
    const res = await qaApi.exportRecords('json')
    console.log('导出响应:', res)
    
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

// 分页
function changePage(page) {
  currentPage.value = page
  loadRecords()
}

// 格式化时间
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

// 截断答案
function truncateAnswer(answer, maxLength = 100) {
  if (!answer) return '无回答'
  if (typeof answer !== 'string') return '无回答'
  if (answer.length <= maxLength) return answer
  return answer.substring(0, maxLength) + '...'
}
</script>

<style scoped>
.qa-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: #f5f7fa;
}

/* 用户名设置栏 */
.user-bar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
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

.btn-save {
  padding: 8px 20px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-save:hover {
  background: #f0f0f0;
  transform: translateY(-1px);
}

.user-hint {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
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

/* 统计栏 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-item.success .stat-value {
  color: #52c41a;
}

.stat-item.failure .stat-value {
  color: #ff4d4f;
}

.stat-item.processing .stat-value {
  color: #1890ff;
}

.stat-actions {
  margin-left: auto;
  display: flex;
  gap: 12px;
}

.btn-export {
  padding: 10px 20px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-export:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.btn-ask {
  padding: 10px 20px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-ask:hover {
  background: #40a9ff;
}

.icon-plus::before {
  content: '+';
  margin-right: 4px;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 10px 16px;
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
  padding: 10px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

/* 记录列表 */
.records-list {
  min-height: 400px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
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

.btn-ask-primary {
  margin-top: 16px;
  padding: 12px 32px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-ask-primary:hover {
  background: #40a9ff;
}

/* 记录网格 */
.records-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.record-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
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
  margin-bottom: 16px;
}

.record-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.record-time {
  font-size: 13px;
  color: #999;
}

.record-status {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
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
  width: 8px;
  height: 8px;
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
  gap: 8px;
}

.btn-icon {
  padding: 6px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  font-size: 16px;
  transition: background 0.3s;
}

.btn-icon:hover {
  background: #f5f5f5;
}

.record-content {
  margin-bottom: 16px;
}

.record-question,
.record-answer {
  margin-bottom: 12px;
  line-height: 1.6;
}

.label {
  font-weight: bold;
  color: #333;
  margin-right: 4px;
}

.text {
  color: #666;
}

.answer-text {
  display: block;
  max-height: 80px;
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
  width: 16px;
  height: 16px;
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
  padding: 4px 12px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 12px;
  font-size: 12px;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 30px;
  padding: 20px;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  border-color: #1890ff;
  color: #1890ff;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #666;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-bar {
    flex-wrap: wrap;
    gap: 16px;
  }

  .stat-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .records-grid {
    grid-template-columns: 1fr;
  }
}
</style>
