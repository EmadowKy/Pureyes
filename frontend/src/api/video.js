import axios from 'axios'

const api = axios.create({
  baseURL: '/api/video-manage',
  timeout: 60000,
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

const videoApi = {
  async getVideoList() {
    return api.get('/list')
  },

  async uploadVideo(videoName, videoFile) {
    const formData = new FormData()
    formData.append('video_name', videoName)
    formData.append('video_file', videoFile)
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  async deleteVideo(videoId) {
    return api.post('/delete', { video_id: videoId })
  },

  async renameVideo(videoId, newName) {
    return api.post('/rename', { video_id: videoId, new_name: newName })
  },

  async tickVideo(videoIds, isTicked) {
    return api.post('/tick', { video_ids: videoIds, is_ticked: isTicked })
  },

  async getVideoInfo(videoId) {
    return api.get('/info', { params: { video_id: videoId } })
  }
}

export { videoApi }
