import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreatorNodeSettingsPanel contract', () => {
  it('uses shared base controls and JsonTreeView for node configuration', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'node-editors', 'PluginCreatorNodeEditorFields.vue'),
      'utf8',
    )

    assert.match(source, /BaseInput/)
    assert.match(source, /BaseSelect/)
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

  it('renders node settings inside a BaseModal instead of the global app panel', () => {
    const pageSource = fs.readFileSync(path.resolve('src/app/pages/PluginCreatorPage.vue'), 'utf8')
    const modalSource = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorNodeSettingsModal.vue'),
      'utf8',
    )

    assert.match(pageSource, /PluginCreatorNodeSettingsModal/)
    assert.match(pageSource, /isNodeSettingsModalOpen/)
    assert.doesNotMatch(pageSource, /function openNodeSettingsPanel/)
    assert.match(modalSource, /BaseModal/)
    assert.match(modalSource, /PluginCreatorNodeSettingsPanel/)
  })

  it('routes every plugin creator utility node type to a dedicated editor', () => {
    const panelSource = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorNodeSettingsPanel.vue'),
      'utf8',
    )
    const editorNames = [
      'MethodNodeEditor',
      'InputFieldNodeEditor',
      'CredentialFieldNodeEditor',
      'RequestNodeEditor',
      'HeaderNodeEditor',
      'QueryParamNodeEditor',
      'JsonBodyNodeEditor',
      'ResponseMapperNodeEditor',
      'ErrorMapperNodeEditor',
      'OutputFieldNodeEditor',
    ]

    for (const editorName of editorNames) {
      assert.match(panelSource, new RegExp(editorName))
      assert.ok(
        fs.existsSync(path.join(componentDir, 'node-editors', `${editorName}.vue`)),
        `${editorName}.vue should exist`,
      )
    }
  })
})
