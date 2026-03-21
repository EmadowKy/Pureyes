import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器：自动带上 access token（若有）
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 -> 只返回 data（与 auth.js 保持一致）
api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err)
)

/** 获取当前用户信息
 * GET /api/users/me
 */
export function getCurrentUser() {
  return api.get('/users/me')
}

export default {
  getCurrentUser
}
