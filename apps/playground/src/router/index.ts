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
    {
      path: '/signup',
      name: 'signup',
      component: () => import('../views/SignupFormView.vue'),
    },
    {
      path: '/field-types',
      name: 'field-types',
      component: () => import('../views/FieldTypesView.vue'),
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('../views/CheckoutView.vue'),
    },
    {
      path: '/stepped-signup',
      name: 'stepped-signup',
      component: () => import('../views/SteppedSignupView.vue'),
    },
    {
      path: '/conditions/:example?',
      name: 'conditions',
      component: () => import('../views/ConditionsView.vue'),
    },
    {
      path: '/conditional-steps',
      name: 'conditional-steps',
      component: () => import('../views/ConditionalStepsView.vue'),
    },
  ],
})

export default router
