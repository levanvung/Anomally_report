import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser } from '../composables/useAuth'

const routes = [
  {
    path: '/',
    redirect: '/reports',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: 'Đăng nhập', guestOnly: true },
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('../views/ReportsView.vue'),
    meta: { title: 'Báo cáo bất thường', requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: 'Tổng quan hệ thống', requiresAuth: true },
  },
  {
    path: '/team',
    name: 'team',
    component: () => import('../views/TeamView.vue'),
    meta: { title: 'Đội ngũ trực ban', requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: 'Cài đặt hệ thống', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/reports',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  document.title = `Sentinel · ${to.meta.title || 'Báo cáo bất thường'}`

  const currentUser = await getCurrentUser()
  const isAuthenticated = Boolean(currentUser)

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.meta.guestOnly && isAuthenticated) {
    next({ name: 'reports' })
  } else {
    next()
  }
})

export default router

