import axios from 'axios'

// 创建 axios 实例（无需在请求前添加 token）
const authApi = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 响应拦截器 - 统一处理错误
authApi.interceptors.response.use(
  response => {
    // 成功响应，直接返回数据
    return response.data
  },
  error => {
    console.error('API 请求错误:', error)
    
    // 处理响应错误
    if (error.response) {
      const { status, data } = error.response
      let errorMessage = data?.message || error.message || '请求失败'
      
      // 针对不同的状态码提供更详细的错误信息
      if (status === 400) {
        errorMessage = data?.message || '请求参数错误'
      } else if (status === 401) {
        errorMessage = data?.message || '未授权，请重新登录'
      } else if (status === 403) {
        errorMessage = data?.message || '禁止访问'
      } else if (status === 404) {
        errorMessage = data?.message || '资源不存在'
      } else if (status === 409) {
        errorMessage = data?.message || '资源已存在'
      } else if (status === 500) {
        errorMessage = data?.message || '服务器内部错误，请稍后重试'
      }
      
      return Promise.reject(new Error(errorMessage))
    } 
    // 处理网络错误
    else if (error.request) {
      return Promise.reject(new Error('网络连接失败，请检查网络设置'))
    } 
    // 其他错误
    else {
      return Promise.reject(new Error(error.message || '请求失败'))
    }
  }
)

/**
 * 用户登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise}
 */
export function login(username, password) {
  return authApi.post('/auth/login', {
    username,
    password
  })
}

/**
 * 用户注册
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {string} email - 邮箱（可选）
 * @returns {Promise}
 */
export function register(username, password, email = null) {
  return authApi.post('/auth/register', {
    username,
    password,
    email
  })
}

/**
 * 刷新 Token
 * @param {string} refreshToken - 刷新 token
 * @returns {Promise}
 */
export function refreshToken(refreshToken) {
  return authApi.post('/auth/refresh', {}, {
    headers: {
      'Authorization': `Bearer ${refreshToken}`
    }
  })
}

/**
 * 清除本地认证信息
 */
export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_info')
}

/**
 * 保存认证信息
 * @param {Object} authData - 认证数据
 */
export function saveAuthInfo(authData) {
  const { access_token, refresh_token, user } = authData
  localStorage.setItem('access_token', access_token)
  localStorage.setItem('refresh_token', refresh_token)
  localStorage.setItem('user_info', JSON.stringify(user))
  localStorage.setItem('qa_username', user.username) // 保持兼容性
  localStorage.setItem('token', access_token) // 保持兼容性
}

/**
 * 获取保存的认证信息
 * @returns {Object}
 */
export function getAuthInfo() {
  const userInfo = localStorage.getItem('user_info')
  return {
    access_token: localStorage.getItem('access_token'),
    refresh_token: localStorage.getItem('refresh_token'),
    user: userInfo ? JSON.parse(userInfo) : null
  }
}
