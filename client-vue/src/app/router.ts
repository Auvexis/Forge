import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/workflows',
    },
    {
      path: '/workflows',
      name: 'workflows',
      component: () => import('@/app/pages/WorkflowEditorPage.vue'),
      meta: { title: 'Editor' },
    },
    {
      path: '/workflows/:id',
      name: 'workflow-editor',
      component: () => import('@/app/pages/WorkflowEditorPage.vue'),
      meta: { title: 'Editor' },
    },
    {
      path: '/forms-test/:formId',
      name: 'form-test',
      component: () => import('@/app/pages/FormPage.vue'),
      meta: { title: 'Test Form', public: true },
    },
    {
      path: '/forms/:formId',
      name: 'form-prod',
      component: () => import('@/app/pages/FormPage.vue'),
      meta: { title: 'Form', public: true },
    },
    {
      path: '/plugins',
      name: 'plugins',
      component: () => import('@/app/pages/PluginsPage.vue'),
      meta: { title: 'Plugins' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/app/pages/NotFoundPage.vue'),
      meta: { title: '404 Não Encontrado' },
    },
  ],
})

router.afterEach((to) => {
  const defaultTitle = 'nd.8'
  // Altera a aba dinamicamente com base nas rotas no formato "Tela — nd.8"
  document.title = to.meta.title ? `${to.meta.title} — ${defaultTitle}` : defaultTitle
})

export default router
