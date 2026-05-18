import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Packets',
    component: () => import('../views/Packets.vue')
  },
  {
    path: '/packet/:id',
    name: 'PacketDetail',
    component: () => import('../views/PacketDetail.vue')
  },
  {
    path: '/import',
    name: 'Import',
    component: () => import('../views/Import.vue')
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('../views/Config.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
