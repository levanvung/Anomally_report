import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

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

router.beforeEach((to, from, next) => {
  document.title = `Sentinel · ${to.meta.title || 'Báo cáo bất thường'}`

  const { isAuthenticated, isLoading } = useAuth()

  // Chờ khởi tạo auth nếu đang tải (đặc biệt khi reload trang)
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.meta.guestOnly && isAuthenticated.value) {
    next({ name: 'reports' })
  } else {
    next()
  }
})

export default router

