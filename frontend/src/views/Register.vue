<template>
  <div class="register-container">
    <div class="register-left">
      <div class="bg-decor decor-1"></div>
      <div class="bg-decor decor-2"></div>
      <div class="bg-decor decor-3"></div>

      <div class="brand-content">
        <h1>🎯 Pureyes</h1>
        <p class="subtitle">智能视频问答系统</p>
        <div class="features">
          <div class="feature-item"><span class="icon">🎬</span><span>视频智能分析</span></div>
          <div class="feature-item"><span class="icon">💬</span><span>AI 问答交互</span></div>
          <div class="feature-item"><span class="icon">⚡</span><span>实时响应</span></div>
        </div>
      </div>
    </div>

    <div class="register-right">
      <div class="theme-tools">
        <button class="theme-btn" @click="toggleThemeMode">{{ themeMode === 'light' ? '🌙' : '☀️' }}</button>
        <button class="dot violet" :class="{active:themeColor==='violet'}" @click="setThemeColor('violet')"></button>
        <button class="dot teal" :class="{active:themeColor==='teal'}" @click="setThemeColor('teal')"></button>
        <button class="dot rose" :class="{active:themeColor==='rose'}" @click="setThemeColor('rose')"></button>
      </div>

      <div class="register-box">
        <h2>创建账户</h2>
        <p class="register-desc">注册新账号开始使用系统</p>

        <transition name="fade-slide">
          <div v-if="errorMsg" class="error-message">⚠️ {{ errorMsg }}</div>
        </transition>

        <div class="form-group">
          <label>用户名</label>
          <input v-model="form.username" type="text" placeholder="请输入用户名（至少3个字符）" :disabled="loading" @keyup.enter="handleRegister" />
          <p v-if="errors.username" class="field-error">{{ errors.username }}</p>
        </div>

        <div class="form-group">
          <label>邮箱（可选）</label>
          <input v-model="form.email" type="email" placeholder="请输入邮箱" :disabled="loading" @keyup.enter="handleRegister" />
          <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
        </div>

        <div class="form-group">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="请输入密码（至少6个字符）" :disabled="loading" @keyup.enter="handleRegister" />
          <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
        </div>

        <div class="form-group">
          <label>确认密码</label>
          <input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" :disabled="loading" @keyup.enter="handleRegister" />
          <p v-if="errors.confirmPassword" class="field-error">{{ errors.confirmPassword }}</p>
        </div>

        <button class="register-btn" :disabled="loading" @click="handleRegister">
          {{ loading ? '注册中...' : '注 册' }}
        </button>

        <div class="login-link"><p>已有账号？<router-link to="/login">立即登录</router-link></p></div>
      </div>
    </div>

    <div class="click-layer">
      <span v-for="r in ripples" :key="r.id" class="click-ripple" :style="{ left: r.x + 'px', top: r.y + 'px' }"></span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '../api/auth'

const router = useRouter()
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({ username: '', email: '', password: '', confirmPassword: '' })
const errors = reactive({ username: '', email: '', password: '', confirmPassword: '' })

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

function validateField(fieldName) {
  errors[fieldName] = ''
  switch (fieldName) {
    case 'username':
      if (!form.username.trim()) errors.username = '用户名不能为空'
      else if (form.username.length < 3) errors.username = '用户名至少需要3个字符'
      break
    case 'email':
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = '邮箱格式不正确'
      break
    case 'password':
      if (!form.password) errors.password = '密码不能为空'
      else if (form.password.length < 6) errors.password = '密码至少需要6个字符'
      break
    case 'confirmPassword':
      if (!form.confirmPassword) errors.confirmPassword = '请确认密码'
      else if (form.password !== form.confirmPassword) errors.confirmPassword = '两次输入的密码不一致'
      break
  }
}
function validateAll() {
  validateField('username'); validateField('email'); validateField('password'); validateField('confirmPassword')
  return !Object.values(errors).some(err => err)
}

async function handleRegister() {
  if (!validateAll()) return

  loading.value = true
  errorMsg.value = ''

  try {
    const response = await register(form.username.trim(), form.password, form.email.trim() || null)
    if (response.code === 200 || response.code === 0 || response.code === 201) {
      alert('注册成功！请用账号密码登录')
      router.push('/login')
    } else {
      errorMsg.value = response.message || '注册失败'
    }
  } catch (error) {
    const errorText = error.message || '注册失败，请重试'
    if (errorText.includes('username') || errorText.includes('already exists')) errorMsg.value = '用户名已存在，请使用其他用户名'
    else if (errorText.includes('email')) errorMsg.value = '邮箱已被注册'
    else errorMsg.value = errorText
    console.error('注册错误:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  applyTheme()
  window.addEventListener('click', handleGlobalClick)
})
onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})
</script>

<style scoped>
* { margin: 0; padding: 0; box-sizing: border-box; }
.register-container { display: flex; width: 100vw; height: 100vh; overflow: hidden; color: var(--text-main); }

.register-left {
  flex: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;
  background: linear-gradient(160deg, color-mix(in srgb, var(--primary) 84%, #fff 16%), color-mix(in srgb, var(--accent) 68%, #000 32%));
}
.bg-decor { position: absolute; border-radius: 50%; opacity: .28; }
.decor-1 { width: 420px; height: 420px; background: #fff; top: -120px; left: -90px; animation: float1 12s ease-in-out infinite; }
.decor-2 { width: 320px; height: 320px; background: color-mix(in srgb, var(--primary) 50%, #fff 50%); right: -80px; bottom: -50px; animation: float2 10s ease-in-out infinite; }
.decor-3 { width: 180px; height: 180px; background: color-mix(in srgb, var(--accent) 55%, #fff 45%); top: 52%; left: 15%; animation: float3 8s ease-in-out infinite; }

.brand-content { text-align: center; color: white; z-index: 2; padding: 40px; animation: fadeUp .7s ease; }
.brand-content h1 { font-size: 56px; margin-bottom: 16px; font-weight: 800; letter-spacing: .5px; }
.subtitle { font-size: 24px; opacity: .95; margin-bottom: 56px; }
.features { display: flex; flex-direction: column; gap: 18px; align-items: center; }
.feature-item { display: flex; align-items: center; gap: 12px; font-size: 18px; opacity: .95; }
.feature-item .icon { font-size: 24px; }

.register-right {
  flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; overflow-y: auto; position: relative;
  background: color-mix(in srgb, var(--bg-page) 84%, #fff 16%);
}
.theme-tools { position: absolute; top: 18px; right: 20px; display: flex; align-items: center; gap: 8px; z-index: 3; }
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

.register-box {
  width: 100%; max-width: 450px; background: var(--bg-card); border-radius: 18px; padding: 40px;
  box-shadow: var(--shadow); border: 1px solid var(--border-soft); animation: fadeUp .45s ease;
  transform-style: preserve-3d; transition: transform .25s ease, box-shadow .25s ease;
}
.register-box:hover {
  transform: perspective(1000px) rotateX(2deg) rotateY(-2deg) translateY(-2px);
  box-shadow: 0 26px 52px color-mix(in srgb, var(--primary) 18%, transparent);
}

.register-box h2 { font-size: 34px; color: var(--text-main); margin-bottom: 8px; font-weight: 800; }
.register-desc { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }

.error-message {
  margin-bottom: 18px; padding: 12px 14px; background: rgba(244, 63, 94, .12); color: #be123c;
  border-radius: 10px; font-size: 14px; border: 1px solid rgba(244, 63, 94, .24);
}
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 8px; color: var(--text-main); font-size: 14px; font-weight: 600; }

.form-group input {
  width: 100%; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--text-main) 14%, transparent);
  border-radius: 10px; font-size: 15px; transition: all .22s ease;
  background: color-mix(in srgb, var(--bg-card) 78%, #fff 22%); color: var(--text-main);
}
.form-group input:focus {
  outline: none; border-color: var(--primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 14%, transparent);
}
.form-group input:disabled { opacity: .7; cursor: not-allowed; }

.field-error { margin-top: 6px; color: #dc2626; font-size: 12px; }

.register-btn {
  width: 100%; padding: 14px; background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff;
  border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 10px;
  transition: transform .2s ease, box-shadow .2s ease, opacity .2s;
}
.register-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--primary) 32%, transparent);
}
.register-btn:disabled { opacity: .75; cursor: not-allowed; }

.login-link { margin-top: 20px; text-align: center; color: var(--text-muted); font-size: 14px; }
.login-link a { color: var(--primary); text-decoration: none; font-weight: 700; }
.login-link a:hover { color: var(--accent); text-decoration: underline; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all .25s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-6px); }

.click-layer { position: fixed; inset: 0; pointer-events: none; z-index: 9999; }
.click-ripple {
  position: absolute; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px; border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--accent) 70%, #fff 30%);
  box-shadow: 0 0 18px color-mix(in srgb, var(--primary) 45%, transparent);
  animation: ripple .65s ease-out forwards;
}
@keyframes ripple { 0% { transform: scale(.4); opacity: .9; } 100% { transform: scale(5.5); opacity: 0; } }

@keyframes fadeUp { from { opacity:0; transform: translateY(14px);} to { opacity:1; transform: translateY(0);} }
@keyframes float1 { 0%,100%{transform: translateY(0);} 50%{transform: translateY(20px);} }
@keyframes float2 { 0%,100%{transform: translateY(0);} 50%{transform: translateY(-18px);} }
@keyframes float3 { 0%,100%{transform: translateX(0);} 50%{transform: translateX(18px);} }

@media (max-width: 900px) {
  .register-container { flex-direction: column; }
  .register-left { min-height: 35vh; padding: 24px; }
  .brand-content h1 { font-size: 38px; }
  .subtitle { font-size: 18px; margin-bottom: 28px; }
  .features { flex-direction: row; flex-wrap: wrap; justify-content: center; }
  .register-right { flex: 1; padding: 24px 18px; }
  .register-box { padding: 28px; }
}
</style>