import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser } from '../composables/useAuth'

const routes = [
  { path: '/', redirect: '/reports' },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('../views/ReportsView.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/reports' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const currentUser = await getCurrentUser()
  if (to.meta.requiresAuth && !currentUser) {
    next({ name: 'login' })
  } else if (to.meta.guestOnly && currentUser) {
    next({ name: 'reports' })
  } else {
    next()
  }
})

export default router
