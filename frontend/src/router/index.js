import { createRouter, createWebHistory } from 'vue-router'
import IntegratedQA from '../views/IntegratedQA.vue'
import Login from '../views/Login.vue'

const routes = [
  { path: '/', redirect: '/qa' },
  { path: '/login', name: 'Login', component: Login, meta: { title: '登录' } },
  { 
    path: '/qa', 
    name: 'QA', 
    component: IntegratedQA, 
    meta: { title: '智能问答', requiresAuth: true } 
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  // 需要登录但没登录，跳转到登录页
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } 
  // 已登录但访问登录页，跳转到首页
  else if (to.path === '/login' && token) {
    next('/qa')
  } 
  else {
    next()
  }
})

export default router
