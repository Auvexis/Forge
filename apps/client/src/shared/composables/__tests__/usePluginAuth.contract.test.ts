import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('plugin OAuth uses a browser-openable backend redirect URL', () => {
  const source = read('src/shared/composables/usePluginAuth.ts')
  const endpoints = read('src/core/api/endpoints.ts')
  const api = read('src/core/api/plugins.api.ts')
  const menu = read('src/features/workflow-editor/components/settings/editors/PluginMenuAuth.vue')

  assert.match(endpoints, /PLUGIN_AUTH_CONNECT_OPEN/)
  assert.match(api, /getAuthOpenUrl/)
  assert.match(source, /authConnectUrl = computed/)
  assert.match(source, /pluginsApi\.getAuthOpenUrl\(id\)/)
  assert.match(source, /markOAuthOpened/)
  assert.match(menu, /<a[\s\S]*target="_blank"[\s\S]*authConnectUrl/)
  assert.match(menu, /handleOAuthLinkClick/)
  assert.doesNotMatch(menu, /@click="handleConnect"/)
})
