import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err)
)

export function getCurrentUser() {
  return api.get('/users/me')
}

export function updateCurrentUser(data) {
  return api.put('/users/me', data)
}

export function deleteCurrentUser() {
  return api.delete('/users/me')
}

export function getUserConfig() {
  return api.get('/users/config')
}

export default {
  getCurrentUser,
  updateCurrentUser,
  deleteCurrentUser,
  getUserConfig
}
