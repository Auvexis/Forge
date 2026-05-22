import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreatorNodeSettingsModal contract', () => {
  it('keeps save run and node update wiring explicit', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorNodeSettingsModal.vue'),
      'utf8',
    )

    assert.match(source, /@click="emit\('save'\)"/)
    assert.match(source, /@click="emit\('run'\)"/)
    assert.match(source, /@update-node="forwardUpdateNode"/)
    assert.match(source, /@update-method="forwardUpdateMethod"/)
    assert.match(source, /@update-request="forwardUpdateRequest"/)
    assert.match(source, /lastTestResult/)
  })
})
