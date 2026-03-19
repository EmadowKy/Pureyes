import { createRouter, createWebHistory } from 'vue-router'
import QAIndex from '../views/qa/QAIndex.vue'
import VideoManage from '../views/video/VideoManage.vue'

const routes = [
  { path: '/', redirect: '/qa' },
  { path: '/qa', name: 'QA', component: QAIndex, meta: { title: '智能问答' } },
  { path: '/video', name: 'Video', component: VideoManage, meta: { title: '视频管理' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
