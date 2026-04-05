import axios from 'axios'
import router from '../router'

const authApi = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

authApi.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API 请求错误:', error)
    
    if (error.response) {
      const { status, data } = error.response
      let errorMessage = data?.message || error.message || '请求失败'
      
      if (status === 400) {
        errorMessage = data?.message || '请求参数错误'
      } else if (status === 401) {
        errorMessage = data?.message || '未授权，请重新登录'
        clearAuthInfo()
        if (router.currentRoute.value.path !== '/login') {
          router.push('/login')
        }
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
    else if (error.request) {
      return Promise.reject(new Error('网络连接失败，请检查网络设置'))
    } 
    else {
      return Promise.reject(new Error(error.message || '请求失败'))
    }
  }
)

export function login(username, password) {
  return authApi.post('/auth/login', { username, password })
}

export function register(username, password, email = null) {
  return authApi.post('/auth/register', { username, password, email })
}

export function refreshToken(refreshToken) {
  return authApi.post('/auth/refresh', {}, {
    headers: {
      'Authorization': `Bearer ${refreshToken}`
    }
  })
}

export function logout() {
  return authApi.post('/auth/logout')
}

export function clearAuthInfo() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_info')
}

export function saveAuthInfo(authData) {
  const { access_token, refresh_token, user } = authData
  localStorage.setItem('access_token', access_token)
  localStorage.setItem('refresh_token', refresh_token)
  localStorage.setItem('user_info', JSON.stringify(user))
}

export function getAuthInfo() {
  const userInfo = localStorage.getItem('user_info')
  return {
    access_token: localStorage.getItem('access_token'),
    refresh_token: localStorage.getItem('refresh_token'),
    user: userInfo ? JSON.parse(userInfo) : null
  }
}

export function isTokenExpired() {
  const token = localStorage.getItem('access_token')
  if (!token) return true
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp * 1000
    return Date.now() >= exp
  } catch {
    return true
  }
}

export async function tryRefreshToken() {
  const refreshTokenValue = localStorage.getItem('refresh_token')
  if (!refreshTokenValue) return false

  try {
    const response = await refreshToken(refreshTokenValue)
    if (response.code === 0 && response.data?.access_token) {
      localStorage.setItem('access_token', response.data.access_token)
      return true
    }
  } catch {
    clearAuthInfo()
  }
  return false
}
