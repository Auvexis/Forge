import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const nodeInspectorSource = readFileSync(
  fileURLToPath(new URL('../NodeInspectorModal.vue', import.meta.url)),
  'utf8',
)

const pluginAuthSource = readFileSync(
  fileURLToPath(new URL('../editors/PluginMenuAuth.vue', import.meta.url)),
  'utf8',
)

const triggerEditorSource = readFileSync(
  fileURLToPath(new URL('../editors/TriggerEditor.vue', import.meta.url)),
  'utf8',
)

describe('workflow editor variable-safe inputs', () => {
  it('uses BaseVariableInput for the node identifier field', () => {
    assert.match(nodeInspectorSource, /BaseVariableInput/)
    assert.match(nodeInspectorSource, /v-model="localId"/)
    assert.match(nodeInspectorSource, /variable-button-title="Insert variable"/)
  })

  it('uses BaseVariableInput for plugin credential text, password, and textarea fields', () => {
    assert.match(pluginAuthSource, /import BaseVariableInput/)
    assert.match(pluginAuthSource, /fieldType="textarea"/)
    assert.match(pluginAuthSource, /:type="field\.inputType"/)
    assert.doesNotMatch(pluginAuthSource, /<BaseTextarea[\s\S]*?field\.inputType === 'textarea'/)
    assert.doesNotMatch(pluginAuthSource, /<BaseInput[\s\S]*?:type="field\.inputType"/)
  })

  it('uses BaseVariableInput for trigger slugs, secrets, cron, and plugin trigger params', () => {
    assert.match(triggerEditorSource, /import BaseVariableInput/)
    assert.match(triggerEditorSource, /webhookSecret/)
    assert.match(triggerEditorSource, /cronExpression/)
    assert.match(triggerEditorSource, /triggerParams/)
    assert.doesNotMatch(triggerEditorSource, /<BaseInput[\s\S]*?webhookSecret/)
    assert.doesNotMatch(triggerEditorSource, /<BaseInput[\s\S]*?cronExpression/)
    assert.doesNotMatch(triggerEditorSource, /<BaseInput[\s\S]*?triggerParams/)
  })
})
