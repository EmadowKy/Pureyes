import { createRouter, createWebHistory } from 'vue-router'
import { isTokenExpired, tryRefreshToken } from '../api/auth'
import IntegratedQA from '../views/IntegratedQA.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import UserProfile from '../views/UserProfile.vue'

const routes = [
  { path: '/', redirect: '/qa' },
  { path: '/login', name: 'Login', component: Login, meta: { title: '登录' } },
  { path: '/register', name: 'Register', component: Register, meta: { title: '注册' } },
  { 
    path: '/qa', 
    name: 'QA', 
    component: IntegratedQA, 
    meta: { title: '智能问答', requiresAuth: true } 
  }
  ,{
    path: '/profile',
    name: 'Profile',
    component: UserProfile,
    meta: { title: '用户信息', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('access_token')
  
  if (to.meta.requiresAuth) {
    if (!token) {
      next('/login')
      return
    }
    
    if (isTokenExpired()) {
      const refreshed = await tryRefreshToken()
      if (!refreshed) {
        next('/login')
        return
      }
    }
  }
  
  if ((to.path === '/login' || to.path === '/register') && token) {
    if (isTokenExpired()) {
      const refreshed = await tryRefreshToken()
      if (!refreshed) {
        next()
        return
      }
    }
    next('/qa')
  } else {
    next()
  }
})

export default router
