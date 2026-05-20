import router from './router.ts'

const paths = router.getRoutes().map((route) => route.path)

if (!paths.includes('/plugin-creator')) {
  throw new Error('Missing /plugin-creator route')
}

if (!paths.includes('/plugin-creator/:pluginId')) {
  throw new Error('Missing /plugin-creator/:pluginId route')
}
