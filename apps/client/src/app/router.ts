import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history:
    typeof window === 'undefined'
      ? createMemoryHistory(import.meta.env?.BASE_URL ?? '/')
      : createWebHistory(import.meta.env?.BASE_URL ?? '/'),
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/app/pages/HomePage.vue'),
      meta: { title: 'Home' },
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
      path: '/pages',
      name: 'pages',
      component: () => import('@/app/pages/PagesEditorPage.vue'),
      meta: { title: 'Pages' },
    },
    {
      path: '/pages/:projectId',
      name: 'pages-editor',
      component: () => import('@/app/pages/PagesEditorPage.vue'),
      meta: { title: 'Pages' },
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
      path: '/p/:profileId/forms/:formId',
      name: 'profile-form-prod',
      component: () => import('@/app/pages/FormPage.vue'),
      meta: { title: 'Form', public: true },
    },
    {
      path: '/temporary-forms/:formId',
      name: 'temporary-form',
      component: () => import('@/app/pages/FormPage.vue'),
      meta: { title: 'Temporary Form', public: true },
    },
    {
      path: '/universe',
      name: 'universe',
      component: () => import('@/app/pages/UniversePage.vue'),
      meta: { title: 'Universe' },
    },
    {
      path: '/plugins',
      redirect: '/universe',
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/app/pages/NotFoundPage.vue'),
      meta: { title: '404 Not Found' },
    },
  ],
})

router.afterEach((to) => {
  const defaultTitle = 'Fabric'
  document.title = to.meta.title ? `${to.meta.title} — ${defaultTitle}` : defaultTitle
})

export default router
