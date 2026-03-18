import { createRouter, createWebHistory } from 'vue-router'
import QAIndex from '../views/qa/QAIndex.vue'

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/home', component: { template: '<div>空白首页</div>' } },
  { path: '/login', component: { template: '<div>空白登录页</div>' } },
  { path: '/video', component: { template: '<div>空白视频页</div>' } },
  { path: '/qa', name: 'QA', component: QAIndex, meta: { title: '智能问答' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router