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
  it('uses BaseInput for the node identifier field', () => {
    assert.match(nodeInspectorSource, /BaseInput/)
    assert.match(nodeInspectorSource, /v-model="localId"/)
    assert.doesNotMatch(nodeInspectorSource, /variable-button-title="Insert variable"/)
  })

  it('uses BaseInput for plugin credential text, password, and textarea fields', () => {
    assert.doesNotMatch(pluginAuthSource, /import BaseVariableInput/)
    assert.doesNotMatch(pluginAuthSource, /fieldType="textarea"/)
    assert.match(pluginAuthSource, /:type="field\.inputType"/)
    assert.doesNotMatch(pluginAuthSource, /<BaseTextarea\b[^>]*field\.inputType === 'textarea'/)
    assert.match(pluginAuthSource, /<BaseInput/)
  })

  it('uses BaseVariableInput for trigger slugs, secrets, cron, and plugin trigger params', () => {
    assert.match(triggerEditorSource, /import BaseVariableInput/)
    assert.match(triggerEditorSource, /import VariablePicker/)
    assert.match(triggerEditorSource, /insertExpressionToken/)
    assert.match(triggerEditorSource, /webhookSecret/)
    assert.match(triggerEditorSource, /cronExpression/)
    assert.match(triggerEditorSource, /triggerParams/)
    assert.match(triggerEditorSource, /@variable-click="toggleTriggerParamPicker\(String\(propKey\)\)"/)
    assert.doesNotMatch(triggerEditorSource, /<BaseInput\b[^>]*webhookSecret/)
    assert.doesNotMatch(triggerEditorSource, /<BaseInput\b[^>]*cronExpression/)
    assert.doesNotMatch(triggerEditorSource, /<BaseInput\b[^>]*triggerParams/)
  })
})
