import router from './router.ts'

const routes = router.getRoutes()
const pluginCreatorRoutes = routes.filter((route) => route.path.startsWith('/plugin-creator'))

if (pluginCreatorRoutes.length !== 2) {
  throw new Error('Expected disabled Plugin Creator redirects for legacy URLs')
}

for (const route of pluginCreatorRoutes) {
  if (route.redirect !== '/workflows') {
    throw new Error(`Plugin Creator route ${route.path} must redirect to /workflows`)
  }

  if (route.components?.default) {
    throw new Error(`Plugin Creator route ${route.path} must not load PluginCreatorPage`)
  }
}
