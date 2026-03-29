<template>
  <div class="login-container">
    <div class="login-left">
      <div class="bg-decor decor-1"></div>
      <div class="bg-decor decor-2"></div>
      <div class="bg-decor decor-3"></div>

      <div class="brand-content">
        <h1>Pureyes</h1>
      </div>
    </div>

    <div class="login-right">
      <div class="theme-tools">
        <button class="theme-btn" @click="toggleThemeMode">{{ themeMode === 'light' ? '🌙' : '☀️' }}</button>
        <button class="dot violet" :class="{active:themeColor==='violet'}" @click="setThemeColor('violet')"></button>
        <button class="dot teal" :class="{active:themeColor==='teal'}" @click="setThemeColor('teal')"></button>
        <button class="dot rose" :class="{active:themeColor==='rose'}" @click="setThemeColor('rose')"></button>
      </div>

      <div class="login-box">
        <h2>欢迎登录</h2>
        <p class="login-desc">请使用您的账号密码登录系统</p>

        <transition name="fade-slide">
          <div v-if="errorMsg" class="error-message">
            <i class="ri-alert-line"></i> {{ errorMsg }}
          </div>
        </transition>

        <div class="form-group">
          <label>用户名</label>
          <input v-model="form.username" type="text" placeholder="请输入用户名" :disabled="loading" @keyup.enter="handleLogin" />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="请输入密码" :disabled="loading" @keyup.enter="handleLogin" />
        </div>

        <button class="login-btn" :disabled="loading" @click="handleLogin">
          {{ loading ? '登录中...' : '登 录' }}
        </button>

        <div class="login-tips"><p>
          <i class="ri-lightbulb-line"></i> 提示：使用已注册的账号和密码登录
        </p></div>
        <div class="register-link"><p>还没有账号？<router-link to="/register">立即注册</router-link></p></div>
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
import { login, saveAuthInfo } from '../api/auth'

const router = useRouter()
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({ username: '', password: '' })

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

const ripples = ref([])
let rippleId = 1
function handleGlobalClick(e) {
  const id = rippleId++
  ripples.value.push({ id, x: e.clientX, y: e.clientY })
  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== id)
  }, 650)
}

async function handleLogin() {
  if (!form.username.trim()) {
    errorMsg.value = '请输入用户名'
    return
  }
  if (!form.password) {
    errorMsg.value = '请输入密码'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const response = await login(form.username, form.password)
    if ((response.code === 0 || response.code === 200) && response.data) {
      saveAuthInfo(response.data)
      router.push('/qa')
    } else {
      errorMsg.value = response.message || '登录失败'
    }
  } catch (error) {
    errorMsg.value = error.message || '登录失败，请检查用户名和密码'
    console.error('登录错误:', error)
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
.login-container { display: flex; width: 100vw; height: 100vh; overflow: hidden; color: var(--text-main); }

.login-left {
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

.login-right {
  flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; position: relative;
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

.login-box {
  width: 100%; max-width: 440px; background: var(--bg-card); border-radius: 18px; padding: 44px;
  box-shadow: var(--shadow); border: 1px solid var(--border-soft); animation: fadeUp .45s ease;
  transform-style: preserve-3d; transition: transform .25s ease, box-shadow .25s ease;
}
.login-box:hover {
  transform: perspective(1000px) rotateX(2deg) rotateY(-2deg) translateY(-2px);
  box-shadow: 0 26px 52px color-mix(in srgb, var(--primary) 18%, transparent);
}
.login-box h2 { font-size: 34px; color: var(--text-main); margin-bottom: 8px; font-weight: 800; }
.login-desc { color: var(--text-muted); font-size: 14px; margin-bottom: 30px; }

.error-message {
  margin-bottom: 20px; padding: 12px 14px; background: rgba(244, 63, 94, .12); color: #be123c;
  border-radius: 10px; font-size: 14px; border: 1px solid rgba(244, 63, 94, .24);
}
.form-group { margin-bottom: 18px; }
.form-group label { display: block; margin-bottom: 8px; color: var(--text-main); font-size: 14px; font-weight: 600; }

.form-group input {
  width: 100%; padding: 13px 14px; border: 1px solid color-mix(in srgb, var(--text-main) 14%, transparent);
  border-radius: 10px; font-size: 15px; transition: all .22s ease;
  background: color-mix(in srgb, var(--bg-card) 78%, #fff 22%); color: var(--text-main);
}
.form-group input:focus {
  outline: none; border-color: var(--primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 14%, transparent);
}
.form-group input:disabled { opacity: .7; cursor: not-allowed; }

.login-btn {
  width: 100%; padding: 14px; background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff;
  border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px;
  transition: transform .2s ease, box-shadow .2s ease, opacity .2s;
}
.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--primary) 32%, transparent);
}
.login-btn:disabled { opacity: .75; cursor: not-allowed; }

.login-tips {
  margin-top: 22px; padding: 14px; border-radius: 10px; text-align: center;
  border: 1px solid color-mix(in srgb, var(--primary) 24%, transparent);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}
.login-tips p { color: var(--primary); font-size: 13px; margin: 0; }

.register-link { margin-top: 16px; text-align: center; color: var(--text-muted); font-size: 14px; }
.register-link a { color: var(--primary); text-decoration: none; font-weight: 700; }
.register-link a:hover { color: var(--accent); text-decoration: underline; }

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
  .login-container { flex-direction: column; }
  .login-left { min-height: 35vh; padding: 24px; }
  .brand-content h1 { font-size: 38px; }
  .subtitle { font-size: 18px; margin-bottom: 28px; }
  .features { flex-direction: row; flex-wrap: wrap; justify-content: center; }
  .login-right { flex: 1; padding: 24px 18px; }
  .login-box { padding: 30px; }
}
</style>