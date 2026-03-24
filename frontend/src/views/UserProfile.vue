<template>
  <div class="profile-container">
    <div class="profile-bg-glow"></div>

    <div class="profile-header">
      <div>
        <h2>用户个人中心</h2>
        <p>查看并更新您的基本信息，与系统中已登录账号保持一致。</p>
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

      <div v-else>
        <el-form :model="form" label-width="120px" label-position="left" status-icon>
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" disabled></el-input>
          </el-form-item>

          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" disabled></el-input>
          </el-form-item>

          <el-form-item label="角色" prop="role">
            <el-input v-model="form.role" disabled></el-input>
          </el-form-item>

          <el-form-item label="激活状态" prop="is_active">
            <el-tag :type="form.is_active ? 'success' : 'danger'">
              {{ form.is_active ? '已激活' : '未激活' }}
            </el-tag>
          </el-form-item>

          <el-form-item label="QA 昵称" prop="qa_username">
            <el-input v-model="form.qa_username" placeholder="用于智能问答的用户名"></el-input>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
            <el-button @click="resetProfile">重置</el-button>
          </el-form-item>
        </el-form>

        <transition name="fade-slide">
          <div v-if="errorMsg" class="profile-error">⚠️ {{ errorMsg }}</div>
        </transition>
      </div>
    </el-card>

    <div class="click-layer">
      <span v-for="r in ripples" :key="r.id" class="click-ripple" :style="{ left: r.x + 'px', top: r.y + 'px' }"></span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCurrentUser } from '../api/user'
import { logout, clearAuthInfo } from '../api/auth'

const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')

const form = reactive({
  username: '',
  email: '',
  role: '',
  is_active: false,
  qa_username: ''
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
      form.username = data.username || ''
      form.email = data.email || ''
      form.role = data.role || 'user'
      form.is_active = data.is_active || false
      form.qa_username = localStorage.getItem('qa_username') || data.username || ''
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

function validateForm() {
  if (!form.qa_username || !form.qa_username.trim()) {
    errorMsg.value = 'QA 昵称不能为空'
    return false
  }
  if (form.qa_username.length < 2) {
    errorMsg.value = 'QA 昵称至少 2 个字符'
    return false
  }
  return true
}

function saveProfile() {
  if (!validateForm()) return

  saving.value = true
  errorMsg.value = ''

  try {
    localStorage.setItem('qa_username', form.qa_username.trim())
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
    if (userInfo && typeof userInfo === 'object') {
      userInfo.username = form.username || userInfo.username
      localStorage.setItem('user_info', JSON.stringify(userInfo))
    }
    ElMessage.success('个人信息已保存')
  } catch (error) {
    console.error('保存失败', error)
    errorMsg.value = error?.message || '个人信息保存失败'
  } finally {
    saving.value = false
  }
}

function resetProfile() { loadUser() }
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
  width: 100vw; min-height: 100vh; padding: 24px 32px; display: flex; flex-direction: column; gap: 20px;
  position: relative; overflow: hidden; color: var(--text-main);
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
  background: var(--bg-card); border-radius: 14px; padding: 16px 20px; box-shadow: var(--shadow);
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
  flex: 1; width: 100%; max-width: 760px; background: var(--bg-card) !important; border-radius: 16px !important; padding: 20px;
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

:deep(.el-card__body) { padding: 10px 8px 4px 8px; }
:deep(.el-form-item__label) { color: var(--text-main); font-weight: 600; }

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
:deep(.el-button--primary:hover) { transform: translateY(-1px); opacity: .95; }
:deep(.el-button--danger) { background: linear-gradient(135deg, #ef4444, #f97316) !important; border: none !important; }

.click-layer { position: fixed; inset: 0; pointer-events: none; z-index: 9999; }
.click-ripple {
  position: absolute; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px; border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--accent) 70%, #fff 30%);
  box-shadow: 0 0 18px color-mix(in srgb, var(--primary) 45%, transparent);
  animation: ripple .65s ease-out forwards;
}
@keyframes ripple { 0% { transform: scale(.4); opacity: .9; } 100% { transform: scale(5.5); opacity: 0; } }
@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }

@media (max-width: 900px) {
  .profile-container { padding: 14px; }
  .profile-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
  .profile-card { max-width: 100%; padding: 14px; }
}
</style>