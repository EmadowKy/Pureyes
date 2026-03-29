<template>
  <div class="profile-container">
    <div class="profile-bg-glow"></div>

    <div class="profile-header">
      <div>
        <h2>用户个人中心</h2>
      </div>
      <div class="header-actions">
        <div class="theme-tools">
          <button class="theme-btn" @click="toggleThemeMode">{{ themeMode === 'light' ? '🌙' : '☀️' }}</button>
          <button class="dot violet" :class="{active:themeColor==='violet'}" @click="setThemeColor('violet')"></button>
          <button class="dot teal" :class="{active:themeColor==='teal'}" @click="setThemeColor('teal')"></button>
          <button class="dot rose" :class="{active:themeColor==='rose'}" @click="setThemeColor('rose')"></button>
        </div>
        <el-button type="primary" size="small" @click="goToQA">返回问答</el-button>
        <el-button type="danger" size="small" @click="handleLogout">退出登录</el-button>
      </div>
    </div>

    <el-card class="profile-card" shadow="hover">
      <div v-if="loading" class="loading-block">
        <div class="spinner"></div>
        <span>正在加载用户信息...</span>
      </div>

      <div v-else class="profile-content">
        <div class="profile-left">
          <div class="user-info-section">
            <div class="user-info-item">
              <div class="info-label">用户ID</div>
              <div class="info-value" style="font-family: 'Courier New', monospace; letter-spacing: 1px;">{{ form.uid }}</div>
            </div>

            <div class="user-info-item">
              <div class="info-label">用户名</div>
              <div class="info-value">{{ form.username }}</div>
            </div>

            <div class="user-info-item">
              <div class="info-label">邮箱</div>
              <div class="info-value">{{ form.email || '未设置' }}</div>
            </div>

            <div class="user-info-item">
              <div class="info-label">角色</div>
              <div class="info-value">{{ form.role }}</div>
            </div>
          </div>

          <transition name="fade-slide">
            <div v-if="errorMsg" class="profile-error">
              <i class="ri-alert-line"></i> {{ errorMsg }}
            </div>
          </transition>
        </div>

        <div class="profile-right">
          <div class="limits-panel">
            <div class="limits-title">使用限制</div>
            
            <div class="limit-item">
              <div class="limit-header">
                <span class="limit-label">视频数量</span>
                <span class="limit-value">{{ form.video_count }}/30</span>
              </div>
              <el-progress 
                :percentage="(form.video_count / 30) * 100" 
                :status="form.video_count >= 30 ? 'exception' : (form.video_count >= 20 ? 'warning' : 'success')"
                :striped="true"
              />
              <div class="limit-info">{{ form.video_count >= 30 ? '已达上限' : `还可上传 ${30 - form.video_count} 个` }}</div>
            </div>

            <div class="limit-item">
              <div class="limit-header">
                <span class="limit-label">存储空间</span>
                <span class="limit-value">{{ formatSize(form.total_video_size) }}/2GB</span>
              </div>
              <el-progress 
                :percentage="(form.total_video_size / 2147483648) * 100" 
                :status="form.total_video_size >= 2147483648 * 0.9 ? 'exception' : (form.total_video_size >= 2147483648 * 0.75 ? 'warning' : 'success')"
                :striped="true"
              />
              <div class="limit-info">{{ formatRemainingSpace }}</div>
            </div>

            <div class="limit-item">
              <div class="limit-header">
                <span class="limit-label">单个视频最大</span>
                <span class="limit-value">500MB</span>
              </div>
              <div class="limit-info">MP4 格式视频文件</div>
            </div>

            <div class="limit-item">
              <div class="limit-header">
                <span class="limit-label">问答记录最多</span>
                <span class="limit-value">100条</span>
              </div>
              <div class="limit-info">已按时间保留最新记录</div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <div class="click-layer">
      <span v-for="r in ripples" :key="r.id" class="click-ripple" :style="{ left: r.x + 'px', top: r.y + 'px' }"></span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCurrentUser } from '../api/user'
import { logout, clearAuthInfo } from '../api/auth'

const router = useRouter()

const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  uid: '',
  username: '',
  email: '',
  role: '',
  video_count: 0,
  total_video_size: 0
})

const themeMode = ref(localStorage.getItem('theme_mode') || 'light')
const themeColor = ref(localStorage.getItem('theme_color') || 'violet')
function applyTheme() {
  document.documentElement.setAttribute('data-theme-mode', themeMode.value)
  document.documentElement.setAttribute('data-theme-color', themeColor.value)
  localStorage.setItem('theme_mode', themeMode.value)
  localStorage.setItem('theme_color', themeColor.value)
}
function toggleThemeMode() { themeMode.value = themeMode.value === 'light' ? 'dark' : 'light'; applyTheme() }
function setThemeColor(color) { themeColor.value = color; applyTheme() }

const ripples = ref([])
let rippleId = 1
function handleGlobalClick(e) {
  const id = rippleId++
  ripples.value.push({ id, x: e.clientX, y: e.clientY })
  setTimeout(() => { ripples.value = ripples.value.filter(r => r.id !== id) }, 650)
}

async function loadUser() {
  loading.value = true
  errorMsg.value = ''
  try {
    const response = await getCurrentUser()
    if (response && (response.code === 0 || response.code === 200)) {
      const data = response.data || response
      form.uid = data.uid || ''
      form.username = data.username || ''
      form.email = data.email || ''
      form.role = data.role || 'user'
      form.video_count = data.video_count || 0
      form.total_video_size = data.total_video_size || 0
    } else {
      errorMsg.value = response?.message || '未能获取用户信息'
    }
  } catch (error) {
    console.error('获取用户信息失败', error)
    errorMsg.value = error?.message || '获取用户信息失败，请稍后重试'
  } finally {
    loading.value = false
  }
}



function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

const formatRemainingSpace = computed(() => {
  const MAX_STORAGE = 2147483648 // 2GB
  const remaining = MAX_STORAGE - form.total_video_size
  if (remaining <= 0) return '已满'
  return `还可上传 ${formatSize(remaining)}`
})

function goToQA() { router.push('/qa') }

async function handleLogout() {
  if (window.confirm('确定要退出登录吗？')) {
    try {
      await logout()
    } catch (error) {
      console.error('登出失败:', error)
    } finally {
      clearAuthInfo()
      router.push('/login')
      ElMessage.success('已成功退出登录')
    }
  }
}

onMounted(() => {
  applyTheme()
  loadUser()
  window.addEventListener('click', handleGlobalClick)
})
onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})
</script>

<style scoped>
.profile-container {
  width: 100%; min-height: 100vh; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px;
  position: relative; overflow: auto; color: var(--text-main);
  background:
    radial-gradient(1200px 600px at 10% 0%, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 50%),
    radial-gradient(1000px 500px at 90% 10%, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 45%),
    linear-gradient(180deg, var(--bg-page) 0%, var(--bg-page-2) 100%);
}
.profile-bg-glow {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(380px 180px at 20% 15%, color-mix(in srgb, var(--primary) 12%, transparent), transparent 70%),
    radial-gradient(340px 160px at 80% 20%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%);
  z-index: 0;
}

.profile-header, .profile-card { position: relative; z-index: 1; }

.profile-header {
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  background: var(--bg-card); border-radius: 14px; padding: 20px 24px; box-shadow: var(--shadow);
  border: 1px solid var(--border-soft); backdrop-filter: blur(6px);
}
.profile-header h2 { margin: 0; font-size: 24px; color: var(--text-main); font-weight: 700; }
.profile-header p { margin-top: 8px; color: var(--text-muted); font-size: 13px; }

.header-actions { display: flex; gap: 10px; flex-shrink: 0; align-items: center; }

.theme-tools { display: flex; align-items: center; gap: 8px; margin-right: 6px; }
.theme-btn {
  border: 1px solid color-mix(in srgb, var(--text-main) 14%, transparent);
  background: var(--bg-card);
  color: var(--text-main);
  border-radius: 10px; padding: 6px 10px; cursor: pointer;
}
.dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #fff; cursor: pointer; }
.dot.active { box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 28%, transparent); }
.dot.violet { background: linear-gradient(135deg,#6d5bff,#ff4da6); }
.dot.teal { background: linear-gradient(135deg,#06b6d4,#10b981); }
.dot.rose { background: linear-gradient(135deg,#e11d48,#fb7185); }

.profile-card {
  flex: 1; width: 100%; background: var(--bg-card) !important; border-radius: 16px !important; padding: 24px;
  box-shadow: var(--shadow) !important; border: 1px solid var(--border-soft); backdrop-filter: blur(8px);
}
.loading-block { display: flex; align-items: center; gap: 10px; padding: 30px; color: var(--text-muted); justify-content: center; }

.spinner {
  width: 20px; height: 20px; border: 3px solid color-mix(in srgb, var(--primary) 30%, transparent);
  border-top: 3px solid var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;
}

.profile-error {
  margin-top: 12px; color: #be123c; font-size: 14px; background: rgba(244,63,94,.12);
  border: 1px solid rgba(244,63,94,.24); border-radius: 10px; padding: 10px 12px;
}
.fade-slide-enter-active, .fade-slide-leave-active { transition: all .25s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-6px); }

:deep(.el-card__body) { padding: 0; }
:deep(.el-form-item__label) { color: var(--text-main); font-weight: 600; }

:deep(.el-form-item) { margin-bottom: 18px; }

.user-info-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.user-info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--primary) 6%, var(--bg-page)), 
    color-mix(in srgb, var(--accent) 4%, var(--bg-page))
  );
  border: 1px solid color-mix(in srgb, var(--border-soft) 60%, transparent);
  border-radius: 12px;
  backdrop-filter: blur(6px);
  transition: all .3s ease;
}

.user-info-item:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, transparent);
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--primary) 10%, var(--bg-page)), 
    color-mix(in srgb, var(--accent) 8%, var(--bg-page))
  );
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 12%, transparent);
}

.info-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  word-break: break-all;
}

:deep(.el-form-item) { margin-bottom: 18px; }
:deep(.el-input__wrapper) {
  border-radius: 10px; box-shadow: 0 0 0 1px color-mix(in srgb, var(--text-main) 14%, transparent) inset;
  transition: all .2s; background-color: color-mix(in srgb, var(--bg-card) 76%, #fff 24%);
}
:deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 24%, transparent) inset; }
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--primary) inset, 0 0 0 4px color-mix(in srgb, var(--primary) 14%, transparent);
  background-color: color-mix(in srgb, var(--bg-card) 88%, #fff 12%);
}
:deep(.el-input.is-disabled .el-input__wrapper) {
  background: color-mix(in srgb, var(--bg-card) 70%, #9ca3af 30%);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--text-main) 14%, transparent) inset;
}

:deep(.el-tag.el-tag--success) { background: rgba(34,197,94,.15); border-color: rgba(34,197,94,.35); color: #15803d; }
:deep(.el-tag.el-tag--danger) { background: rgba(239,68,68,.15); border-color: rgba(239,68,68,.35); color: #dc2626; }

:deep(.el-button--primary) {
  background: linear-gradient(135deg, var(--primary), var(--accent)) !important;
  border: none !important;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--primary) 24%, transparent);
}
:deep(.el-button--primary:hover) { transform: translateY(-2px); opacity: .95; box-shadow: 0 12px 24px color-mix(in srgb, var(--primary) 30%, transparent); }
:deep(.el-button--danger) { background: linear-gradient(135deg, #ef4444, #f97316) !important; border: none !important; }
:deep(.el-button) { border-radius: 8px; font-weight: 600; transition: all .2s; }

.click-layer { position: fixed; inset: 0; pointer-events: none; z-index: 9999; }
.click-ripple {
  position: absolute; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px; border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--accent) 70%, #fff 30%);
  box-shadow: 0 0 18px color-mix(in srgb, var(--primary) 45%, transparent);
  animation: ripple .65s ease-out forwards;
}
@keyframes ripple { 0% { transform: scale(.4); opacity: .9; } 100% { transform: scale(5.5); opacity: 0; } }
@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }

.profile-content {
  display: flex; gap: 28px; align-items: flex-start; height: 100%;
}

.profile-left {
  flex: 1; min-width: 0;
}

.profile-right {
  flex: 1; min-width: 0;
}

.limits-panel {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--primary) 8%, var(--bg-card)), 
    color-mix(in srgb, var(--accent) 6%, var(--bg-card))
  );
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 14px; padding: 28px; backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  position: sticky; top: 20px;
}

.limits-title {
  font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 22px;
  display: flex; align-items: center; gap: 8px; padding-bottom: 14px;
  border-bottom: 2px solid color-mix(in srgb, var(--primary) 30%, transparent);
}

.limit-item {
  margin-bottom: 22px; padding-bottom: 16px; border-bottom: 1px solid color-mix(in srgb, var(--border-soft) 60%, transparent);
}

.limit-item:last-child {
  margin-bottom: 0; padding-bottom: 0; border-bottom: none;
}

.limit-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
}

.limit-label {
  font-size: 14px; font-weight: 600; color: var(--text-main);
}

.limit-value {
  font-size: 16px; font-weight: 700; background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

.limit-info {
  font-size: 13px; color: var(--text-muted); margin-top: 8px; line-height: 1.5;
}

:deep(.el-progress) {
  margin: 10px 0 !important;
}

:deep(.el-progress__bar) {
  background: linear-gradient(90deg, var(--primary), var(--accent)) !important;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 30%, transparent);
}

:deep(.el-progress__text) {
  font-size: 13px !important;
  font-weight: 600 !important;
}

:deep(.el-progress__outer) {
  height: 8px !important;
}

@media (max-width: 1200px) {
  .profile-content {
    gap: 24px;
  }
}

@media (max-width: 1024px) {
  .profile-container { padding: 16px 20px; }
  .profile-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
  .profile-card { padding: 20px; }
  
  .profile-content {
    flex-direction: column;
  }
  
  .profile-right {
    width: 100%;
  }
  
  .limits-panel {
    position: static;
  }
}

@media (max-width: 768px) {
  .profile-container { padding: 12px 16px; }
  .profile-card { padding: 16px; }
  .profile-content { gap: 16px; }
  
  .limits-panel {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .limit-item {
    margin-bottom: 0; padding-bottom: 0; border-bottom: none;
  }
}

@media (max-width: 480px) {
  .profile-container { padding: 12px; }
  .profile-card { padding: 12px; }
  .header-actions { gap: 6px; }
  
  .limits-panel {
    grid-template-columns: 1fr;
  }
}
</style>