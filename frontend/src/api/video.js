// frontend/src/api/video.js
import axios from 'axios'

const API_BASE_URL = '/api/video'

const videoApi = {
  // 获取视频列表
  async getVideoList() {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token')
    const response = await axios.get(`${API_BASE_URL}/list`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return response.data
  },

  // 上传视频
  async uploadVideo(videoName, videoFile) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token')
    const formData = new FormData()
    formData.append('video_name', videoName)
    formData.append('video_file', videoFile)
    
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // 删除视频
  async deleteVideo(videoId) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token')
    const response = await axios.post(`${API_BASE_URL}/delete`, {
      video_id: videoId
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return response.data
  },

  // 重命名视频
  async renameVideo(videoId, newName) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token')
    const response = await axios.post(`${API_BASE_URL}/rename`, {
      video_id: videoId,
      new_name: newName
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return response.data
  },

  // 勾选视频
  async tickVideo(videoIds, isTicked) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token')
    const response = await axios.post(`${API_BASE_URL}/tick`, {
      video_ids: videoIds,
      is_ticked: isTicked
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return response.data
  },

  // 获取单个视频信息
  async getVideoInfo(videoId) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token')
    const response = await axios.get(`${API_BASE_URL}/info`, {
      params: {
        video_id: videoId
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return response.data
  }
}

export { videoApi }
