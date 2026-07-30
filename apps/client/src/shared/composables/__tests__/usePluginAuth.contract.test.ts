import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('plugin OAuth opens the provider URL without replacing Fabric', () => {
  const source = read('src/shared/composables/usePluginAuth.ts')
  const endpoints = read('src/core/api/endpoints.ts')
  const api = read('src/core/api/plugins.api.ts')
  const menu = read('src/features/workflow-editor/components/settings/editors/PluginMenuAuth.vue')

  assert.match(endpoints, /PLUGIN_AUTH_CONNECT/)
  assert.match(api, /getAuthUrl/)
  assert.match(source, /pluginsApi\.getAuthUrl\(id\)/)
  assert.match(source, /window\.open\('about:blank', '_blank'\)/)
  assert.match(source, /browserTab\.location\.replace\(providerUrl\.toString\(\)\)/)
  assert.match(source, /window\.fabricDesktop!\.openExternal/)
  assert.match(source, /scheduleConnectionCheck\(\)/)
  assert.match(source, /window\.setTimeout/)
  assert.match(source, /stopConnectionPolling\(\)/)
  assert.doesNotMatch(source, /window\.location\.assign/)
  assert.match(menu, /<button[\s\S]*@click="handleConnect"/)
  assert.doesNotMatch(menu, /target="_blank"|authConnectUrl|handleOAuthLinkClick/)
})
