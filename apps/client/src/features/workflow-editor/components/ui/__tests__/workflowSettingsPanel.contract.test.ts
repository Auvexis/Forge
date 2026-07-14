import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const source = readFileSync(
  fileURLToPath(new URL('../WorkflowSettingsPanel.vue', import.meta.url)),
  'utf8',
)

test('workflow settings edits active workflow metadata and relies on rail save', () => {
  assert.doesNotMatch(source, /<template #actions>/)
  assert.doesNotMatch(source, /icon-left="save"/)
  assert.doesNotMatch(source, /saveWorkflow/)
  assert.doesNotMatch(source, /async function handleSave/)
  assert.doesNotMatch(source, /const draft = ref/)
  assert.match(source, /function updateMetadata\(patch: Partial<WorkflowItem\['metadata'\]>\)/)
  assert.match(source, /workflow\.metadata = \{[\s\S]*\.\.\.workflow\.metadata,[\s\S]*\.\.\.patch,[\s\S]*\}/)
  assert.match(source, /const workflowName = computed\(\{[\s\S]*set: \(name: string\) => updateMetadata\(\{ name \}\)/)
  assert.match(source, /const workflowDescription = computed\(\{[\s\S]*set: \(description: string\) => updateMetadata\(\{ description \}\)/)
  assert.match(source, /const workflowActive = computed\(\{[\s\S]*set: \(isActive: boolean\) => updateMetadata\(\{ isActive \}\)/)
  assert.match(source, /<BaseInput v-model="workflowName"/)
  assert.match(source, /<BaseTextarea[\s\S]*v-model="workflowDescription"/)
  assert.match(source, /<BaseSwitch v-model="workflowActive"/)
})
