import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginFormView.vue'),
    },
    {
      path: '/order',
      name: 'order',
      component: () => import('../views/OrderFormView.vue'),
    },
  ],
})

export default router
