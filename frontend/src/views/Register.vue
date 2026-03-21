<template>
  <div class="register-container">
    <!-- 左侧：品牌区域 -->
    <div class="register-left">
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
    
    <!-- 右侧：注册表单 -->
    <div class="register-right">
      <div class="register-box">
        <h2>创建账户</h2>
        <p class="register-desc">注册新账号开始使用系统</p>
        
        <!-- 错误提示 -->
        <div v-if="errorMsg" class="error-message">
          ⚠️ {{ errorMsg }}
        </div>
        
        <div class="form-group">
          <label>用户名</label>
          <input 
            v-model="form.username" 
            type="text" 
            placeholder="请输入用户名（至少3个字符）"
            :disabled="loading"
            @keyup.enter="handleRegister"
          />
          <p v-if="errors.username" class="field-error">{{ errors.username }}</p>
        </div>
        
        <div class="form-group">
          <label>邮箱（可选）</label>
          <input 
            v-model="form.email" 
            type="email" 
            placeholder="请输入邮箱"
            :disabled="loading"
            @keyup.enter="handleRegister"
          />
          <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码（至少6个字符）"
            :disabled="loading"
            @keyup.enter="handleRegister"
          />
          <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
        </div>
        
        <div class="form-group">
          <label>确认密码</label>
          <input 
            v-model="form.confirmPassword" 
            type="password" 
            placeholder="请再次输入密码"
            :disabled="loading"
            @keyup.enter="handleRegister"
          />
          <p v-if="errors.confirmPassword" class="field-error">{{ errors.confirmPassword }}</p>
        </div>
        
        <button 
          class="register-btn" 
          :disabled="loading"
          @click="handleRegister"
        >
          {{ loading ? '注册中...' : '注 册' }}
        </button>
        
        <div class="login-link">
          <p>已有账号？<router-link to="/login">立即登录</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '../api/auth'

const router = useRouter()
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 验证单个字段
function validateField(fieldName) {
  errors[fieldName] = ''
  
  switch (fieldName) {
    case 'username':
      if (!form.username.trim()) {
        errors.username = '用户名不能为空'
      } else if (form.username.length < 3) {
        errors.username = '用户名至少需要3个字符'
      }
      break
      
    case 'email':
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = '邮箱格式不正确'
      }
      break
      
    case 'password':
      if (!form.password) {
        errors.password = '密码不能为空'
      } else if (form.password.length < 6) {
        errors.password = '密码至少需要6个字符'
      }
      break
      
    case 'confirmPassword':
      if (!form.confirmPassword) {
        errors.confirmPassword = '请确认密码'
      } else if (form.password !== form.confirmPassword) {
        errors.confirmPassword = '两次输入的密码不一致'
      }
      break
  }
}

// 验证所有字段
function validateAll() {
  validateField('username')
  validateField('email')
  validateField('password')
  validateField('confirmPassword')
  
  return !Object.values(errors).some(err => err)
}

async function handleRegister() {
  if (!validateAll()) {
    return
  }
  
  loading.value = true
  errorMsg.value = ''
  
  try {
    // 调用后端注册 API
    const response = await register(
      form.username.trim(),
      form.password,
      form.email.trim() || null
    )
    
    // 注册成功 - 返回的 code 应该是 200 或 0（成功）
    if (response.code === 200 || response.code === 0 || response.code === 201) {
      // 注册成功，跳转到登录页
      alert('注册成功！请用账号密码登录')
      router.push('/login')
    } else {
      errorMsg.value = response.message || '注册失败'
    }
  } catch (error) {
    // 根据错误信息显示对应的错误
    const errorText = error.message || '注册失败，请重试'
    
    if (errorText.includes('username') || errorText.includes('already exists')) {
      errorMsg.value = '用户名已存在，请使用其他用户名'
    } else if (errorText.includes('email')) {
      errorMsg.value = '邮箱已被注册'
    } else if (errorText.includes('参数') || errorText.includes('密码')) {
      errorMsg.value = errorText
    } else {
      errorMsg.value = errorText
    }
    console.error('注册错误:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.register-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 左侧品牌区域 */
.register-left {
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

/* 右侧注册区域 */
.register-right {
  flex: 1;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  overflow-y: auto;
}

.register-box {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  padding: 50px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.register-box h2 {
  font-size: 32px;
  color: #333;
  margin-bottom: 8px;
}

.register-desc {
  color: #666;
  font-size: 14px;
  margin-bottom: 30px;
}

.error-message {
  margin-bottom: 24px;
  padding: 12px 16px;
  background: #fee;
  color: #c00;
  border-radius: 8px;
  font-size: 14px;
  border-left: 4px solid #c00;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-group {
  margin-bottom: 20px;
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
  padding: 12px 14px;
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

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-error {
  margin-top: 6px;
  color: #c00;
  font-size: 12px;
}

.register-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 10px;
}

.register-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.register-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-link {
  margin-top: 24px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.login-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s;
}

.login-link a:hover {
  color: #764ba2;
  text-decoration: underline;
}

/* 响应式：小屏幕时改为上下布局 */
@media (max-width: 900px) {
  .register-container {
    flex-direction: column;
  }
  
  .register-left {
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
  
  .register-right {
    flex: 1;
    padding: 30px 20px;
  }
  
  .register-box {
    padding: 30px;
  }
}
</style>
