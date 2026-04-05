import axios from 'axios'

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 300000, // 5 分钟超时，适应 AI 模型处理时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
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
    // 如果是文件下载（Blob），直接返回，不解析 JSON
    if (response.config.responseType === 'blob') {
      return response
    }
    
    const res = response.data
    console.log('API 响应:', res)
    // 直接返回响应数据，不做code检查
    return res
  },
  error => {
    console.error('API 请求错误:', error)

    if (error.response && error.response.status === 401) {
      // 认证失效，清空本地信息并跳转登录
      localStorage.removeItem('token')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_info')
      window.location.href = '/login'
    }

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
      video_paths: data.video_paths
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
  },

  /**
   * 获取任务实时进度
   * @param {string} taskId - 任务 ID
   * @returns {Promise}
   */
  getTaskProgress(taskId) {
    return api.get(`/qa/task/${taskId}/progress`)
  },

  /**
   * 订阅任务实时进度流（使用 SSE）
   * @param {string} taskId - 任务 ID
   * @param {Function} onProgress - 进度回调函数
   * @param {Function} onComplete - 完成回调函数
   * @param {Function} onError - 错误回调函数
   * @returns {EventSource} - 返回 EventSource 对象，可以通过 .close() 关闭连接
   */
  subscribeTaskProgress(taskId, onProgress, onComplete, onError, tokenOverride = '') {
    const token = tokenOverride || localStorage.getItem('access_token')
    const url = `/api/qa/task/${taskId}/stream${token ? '?token=' + encodeURIComponent(token) : ''}`
    
    const eventSource = new EventSource(url)
    
    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'progress' && onProgress) {
          onProgress(data.data)
        } else if (data.type === 'complete' && onComplete) {
          onComplete(data)
          eventSource.close()
        } else if (data.type === 'connected') {
          console.log('SSE 连接已建立，任务:', taskId)
          // 如果有 submit_time，通过特殊进度项返回
          if (data.submit_time && onProgress) {
            onProgress({ stage: 'system', status: 'submit_time', data: { submit_time: data.submit_time } })
          }
        }
      } catch (error) {
        console.error('解析 SSE 数据失败:', error)
      }
    })
    
    eventSource.addEventListener('error', (event) => {
      console.error('SSE 连接错误:', event)
      eventSource.close()
      if (onError) {
        onError(event)
      }
    })
    
    return eventSource
  }
}

export default api
