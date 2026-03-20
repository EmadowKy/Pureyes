import { createRouter, createWebHistory } from 'vue-router'
import IntegratedQA from '../views/IntegratedQA.vue'

const routes = [
  { path: '/', redirect: '/qa' },
  { path: '/qa', name: 'QA', component: IntegratedQA, meta: { title: '智能问答' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
