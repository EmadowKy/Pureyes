import axios from 'axios'

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 300000, // 5 分钟超时，适应 AI 模型处理时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加 token 和用户名
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    // 添加用户名到 header（如果存在）
    const username = localStorage.getItem('qa_username')
    if (username) {
      config.headers['X-Username'] = username
    }
    
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一处理错误
api.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code !== 200) {
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    return res
  },
  error => {
    console.error('API 请求错误:', error)
    return Promise.reject(error)
  }
)

/**
 * QA 模块 API 接口
 */
export const qaApi = {
  /**
   * 提问 - 向模型发送问题
   * @param {Object} data - 请求数据
   * @param {string} data.question - 问题内容
   * @param {string[]} data.video_paths - 视频路径列表
   * @param {Object} options - 可选配置
   * @param {number} options.timeout - 超时时间（毫秒），默认 300000（5 分钟）
   * @returns {Promise}
   */
  askQuestion(data, options = {}) {
    const timeout = options.timeout || 300000 // 默认 5 分钟超时
    return api.post('/qa/ask', {
      question: data.question,
      video_paths: data.video_paths,
      username: data.username
    }, {
      timeout
    })
  },

  /**
   * 获取用户的问答记录列表
   * @param {Object} params - 请求参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @returns {Promise}
   */
  getRecords(params) {
    return api.get('/qa/records', { params })
  },

  /**
   * 获取单条问答记录详情
   * @param {string} recordId - 记录 ID
   * @returns {Promise}
   */
  getRecord(recordId) {
    return api.get(`/qa/record/${recordId}`)
  },

  /**
   * 删除问答记录
   * @param {string} recordId - 记录 ID
   * @returns {Promise}
   */
  deleteRecord(recordId) {
    return api.delete(`/qa/record/${recordId}`)
  },

  /**
   * 获取统计摘要
   * @returns {Promise}
   */
  getSummary() {
    return api.get('/qa/summary')
  },

  /**
   * 导出问答记录
   * @param {string} format - 导出格式 (json/csv)
   * @returns {Promise<Blob>}
   */
  exportRecords(format = 'json') {
    return api.get('/qa/export', {
      params: { format },
      responseType: 'blob'
    })
  }
}

export default api
