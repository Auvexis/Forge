import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreatorNodeSettingsPanel contract', () => {
  it('uses shared base controls and JsonTreeView for node configuration', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorNodeSettingsPanel.vue'),
      'utf8',
    )

    assert.match(source, /BaseInput/)
    assert.match(source, /BaseCodeEditor/)
    assert.match(source, /BaseSwitch/)
    assert.match(source, /JsonTreeView/)
  })

  it('keeps plugin metadata separate from per-node method settings', () => {
    const settingsSource = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorPluginSettings.vue'),
      'utf8',
    )
    const modalSource = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorWorkspaceModal.vue'),
      'utf8',
    )

    assert.match(settingsSource, /Plugin metadata/)
    assert.doesNotMatch(settingsSource, /Method metadata/)
    assert.match(modalSource, /PluginCreatorPluginSettings/)
    assert.doesNotMatch(modalSource, /PluginCreatorInspector/)
  })
})
