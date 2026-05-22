import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentPath = path.resolve(
  'src/features/plugin-creator/components/PluginCreatorTestPanel.vue',
)
const workspaceModalPath = path.resolve(
  'src/features/plugin-creator/components/PluginCreatorWorkspaceModal.vue',
)
const pagePath = path.resolve('src/app/pages/PluginCreatorPage.vue')

describe('PluginCreatorTestPanel contract', () => {
  it('shows inputs, credentials, rendered request and response details', () => {
    const source = fs.readFileSync(componentPath, 'utf8')

    for (const label of [
      'Test Panel',
      'Method inputs',
      'Test credentials',
      'Rendered request',
      'Response status',
      'Response headers',
      'Response body',
      'Duration',
      'Error',
    ]) {
      assert.match(source, new RegExp(label))
    }

    assert.match(source, /test-method/)
    assert.match(source, /lastTestResult/)
    assert.match(source, /JSON\.stringify/)
  })

  it('is mounted in the plugin creator page', () => {
    const page = fs.readFileSync(pagePath, 'utf8')
    const workspaceModal = fs.readFileSync(workspaceModalPath, 'utf8')

    assert.match(page, /PluginCreatorWorkspaceModal/)
    assert.match(workspaceModal, /PluginCreatorTestPanel/)
    assert.match(page, /runMethodTest/)
  })
})
