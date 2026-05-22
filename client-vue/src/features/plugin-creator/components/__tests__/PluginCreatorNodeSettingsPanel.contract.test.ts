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
    assert.match(source, /editor-stack/)
    assert.match(source, /te-section/)
  })

  it('groups small configuration inside method request and code block settings', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'node-editors', 'PluginCreatorNodeEditorFields.vue'),
      'utf8',
    )

    for (const label of [
      'Inputs',
      'Credentials',
      'Add input',
      'Add credential',
      'Headers',
      'Query params',
      'Body',
      'Add header',
      'Add query param',
      'Code Block',
      'Output name',
      'Source',
    ]) {
      assert.match(source, new RegExp(label))
    }
  })

  it('uses the workflow inspector modal layout with JsonTreeView context panes', () => {
    const modalSource = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorNodeSettingsModal.vue'),
      'utf8',
    )

    assert.match(modalSource, /max-width="1600px"/)
    assert.match(modalSource, /height="85vh"/)
    assert.match(modalSource, /inspector-grid/)
    assert.match(modalSource, /inspector-pane/)
    assert.match(modalSource, /INPUT \(Past\)/)
    assert.match(modalSource, /OUTPUT \(Future\)/)
    assert.match(modalSource, /JsonTreeView/)
    assert.match(modalSource, /LucideIcon/)
    assert.match(modalSource, /BaseButton/)
  })

  it('keeps editor update events explicit so closing the modal does not drop edits', () => {
    const editorDir = path.join(componentDir, 'node-editors')
    const editors = fs
      .readdirSync(editorDir)
      .filter((file) => file.endsWith('NodeEditor.vue') || file === 'InputFieldNodeEditor.vue')

    for (const editor of editors) {
      const source = fs.readFileSync(path.join(editorDir, editor), 'utf8')
      assert.match(source, /defineProps/)
      assert.match(source, /defineEmits|v-on="\$attrs"/)
    }
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
      'CodeBlockNodeEditor',
      'OutputNodeEditor',
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
