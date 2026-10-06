import { createRouter, createWebHistory } from 'vue-router'

// One screen; all view state lives in the query string (see stores/url-sync.ts).
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{ path: '/', name: 'map', component: { render: () => null } }],
})

export default router
