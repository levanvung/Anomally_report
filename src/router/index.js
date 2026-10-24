import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/reports' },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('./views/ReportsView.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/LoginView.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/reports' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router