<template>
  <div class="login-container">
    <!-- 左侧：品牌区域 -->
    <div class="login-left">
      <div class="brand-content">
        <h1>🎯 Pureyes</h1>
        <p class="subtitle">智能视频问答系统</p>
        <div class="features">
          <div class="feature-item">
            <span class="icon">🎬</span>
            <span>视频智能分析</span>
          </div>
          <div class="feature-item">
            <span class="icon">💬</span>
            <span>AI 问答交互</span>
          </div>
          <div class="feature-item">
            <span class="icon">⚡</span>
            <span>实时响应</span>
          </div>
        </div>
      </div>
      <div class="decoration-circle"></div>
      <div class="decoration-circle-2"></div>
    </div>
    
    <!-- 右侧：登录表单 -->
    <div class="login-right">
      <div class="login-box">
        <h2>欢迎登录</h2>
        <p class="login-desc">请使用您的账号密码登录系统</p>
        
        <div class="form-group">
          <label>用户名</label>
          <input 
            v-model="form.username" 
            type="text" 
            placeholder="请输入用户名"
            @keyup.enter="handleLogin"
          />
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          />
        </div>
        
        <button 
          class="login-btn" 
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        
        <div class="login-tips">
          <p>💡 测试账号：任意用户名密码即可登录</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

async function handleLogin() {
  if (!form.username.trim()) {
    alert('请输入用户名')
    return
  }
  if (!form.password) {
    alert('请输入密码')
    return
  }
  
  loading.value = true
  
  setTimeout(() => {
    localStorage.setItem('token', 'test_token_' + Date.now())
    localStorage.setItem('qa_username', form.username)
    
    loading.value = false
    alert('登录成功！')
    router.push('/qa')
  }, 800)
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 左侧品牌区域 */
.login-left {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.brand-content {
  text-align: center;
  color: white;
  z-index: 2;
  padding: 40px;
}

.brand-content h1 {
  font-size: 56px;
  margin-bottom: 16px;
  font-weight: 700;
}

.subtitle {
  font-size: 24px;
  opacity: 0.9;
  margin-bottom: 60px;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  opacity: 0.85;
}

.feature-item .icon {
  font-size: 24px;
}

/* 装饰圆圈 */
.decoration-circle {
  position: absolute;
  width: 600px;
  height: 600px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  top: -200px;
  right: -200px;
}

.decoration-circle-2 {
  position: absolute;
  width: 400px;
  height: 400px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  bottom: -100px;
  left: -100px;
}

/* 右侧登录区域 */
.login-right {
  flex: 1;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.login-box {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  padding: 50px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.login-box h2 {
  font-size: 32px;
  color: #333;
  margin-bottom: 8px;
}

.login-desc {
  color: #666;
  font-size: 14px;
  margin-bottom: 40px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.3s;
  background: #fafafa;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.login-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 16px;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-tips {
  margin-top: 30px;
  padding: 16px;
  background: #f0f4ff;
  border-radius: 10px;
  text-align: center;
  border-left: 4px solid #667eea;
}

.login-tips p {
  color: #667eea;
  font-size: 13px;
  margin: 0;
}

/* 响应式：小屏幕时改为上下布局 */
@media (max-width: 900px) {
  .login-container {
    flex-direction: column;
  }
  
  .login-left {
    min-height: 35vh;
    padding: 30px;
  }
  
  .brand-content h1 {
    font-size: 36px;
  }
  
  .subtitle {
    font-size: 18px;
    margin-bottom: 30px;
  }
  
  .features {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .login-right {
    flex: 1;
    padding: 30px 20px;
  }
  
  .login-box {
    padding: 30px;
  }
}
</style>
