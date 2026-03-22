<template>
  <div class="profile-container">
    <div class="profile-header">
      <div>
        <h2>用户个人中心</h2>
        <p>查看并更新您的基本信息，与系统中已登录账号保持一致。</p>
      </div>
      <div class="header-actions">
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

        <div v-if="errorMsg" class="profile-error">⚠️ {{ errorMsg }}</div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
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
    // 目前后端未提供更新接口，仅在本地保存用于 QA 使用
    localStorage.setItem('qa_username', form.qa_username.trim())

    // 若有 user_info，更新缓存
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

function resetProfile() {
  loadUser()
}

function goToQA() {
  router.push('/qa')
}

async function handleLogout() {
  if (window.confirm('确定要退出登录吗？')) {
    try {
      // 调用后端登出接口
      await logout()
    } catch (error) {
      console.error('登出失败:', error)
    } finally {
      // 无论后端登出是否成功，都清除本地认证信息
      clearAuthInfo()
      router.push('/login')
      ElMessage.success('已成功退出登录')
    }
  }
}

onMounted(() => {
  loadUser()
})
</script>

<style scoped>
.profile-container {
  width: 100vw;
  min-height: 100vh;
  padding: 24px 32px;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 12px;
  padding: 14px 20px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
}

.profile-header h2 {
  margin: 0;
  font-size: 22px;
  color: #333;
}

.profile-header p {
  margin-top: 6px;
  color: #666;
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.profile-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  max-width: 700px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
}

.loading-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 30px;
  color: #888;
  justify-content: center;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #c3cde6;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.profile-error {
  margin-top: 12px;
  color: #c00;
  font-size: 14px;
}
</style>
