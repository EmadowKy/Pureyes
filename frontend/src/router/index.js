import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/home', component: { template: '<div>空白首页</div>' } },
  { path: '/login', component: { template: '<div>空白登录页</div>' } },
  { path: '/video', component: { template: '<div>空白视频页</div>' } },
  { path: '/qa', component: { template: '<div>空白问答页</div>' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router