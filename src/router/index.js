import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

// 日报与问题是两个平级的独立视图，通过路由区分
const routes = [
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'reports', component: () => import('@/components/ReportTimeline.vue') },
      { path: 'issues', name: 'issues', component: () => import('@/components/IssueList.vue') }
    ]
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/views/UserManageView.vue'),
    meta: { requiresAuth: true, admin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局路由守卫：未登录跳转登录页；/users 仅 ADMIN 可进
router.beforeEach((to) => {
  const token = localStorage.getItem('worklog_token')
  if (to.meta.public) {
    // 已登录访问登录页 -> 回首页
    return token ? { path: '/' } : true
  }
  if (!token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.admin) {
    let user = null
    try {
      user = JSON.parse(localStorage.getItem('worklog_user') || 'null')
    } catch {
      user = null
    }
    if (user?.role !== 'ADMIN') {
      return { path: '/' }
    }
  }
  return true
})

export default router
