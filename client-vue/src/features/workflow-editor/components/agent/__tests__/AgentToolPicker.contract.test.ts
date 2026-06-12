import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('agent tool picker loads tools through the frontend api', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentToolPicker.vue')

  assert.match(source, /agentToolsApi/)
  assert.match(source, /listTools\(/)
  assert.match(source, /loadTools/)
  assert.match(source, /onMounted/)
})

test('agent tool picker filters by plugin, method name, and description', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentToolPicker.vue')

  assert.match(source, /filteredTools/)
  assert.match(source, /pluginId/)
  assert.match(source, /methodId/)
  assert.match(source, /description/)
})

test('agent tool picker shows schema, side effect, and approval policy', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentToolPicker.vue')

  assert.match(source, /inputSchema/)
  assert.match(source, /schemaPreview/)
  assert.match(source, /sideEffect/)
  assert.match(source, /requiresApproval/)
})

test('agent tool picker emits selected plugin and method ids without credential fields', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentToolPicker.vue')

  assert.match(source, /defineEmits/)
  assert.match(source, /selectTool/)
  assert.match(source, /pluginId: tool\.pluginId/)
  assert.match(source, /methodId: tool\.methodId/)
  assert.doesNotMatch(source, /credential(Value|Secret|Token|Key)/)
})

test('ai tool editor does not re-open the global picker after quick-add selection', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiToolEditor.vue')

  assert.doesNotMatch(source, /import AgentToolPicker/)
  assert.doesNotMatch(source, /<AgentToolPicker/)
  assert.match(source, /Integration \(Plugin\)/)
  assert.match(source, /Action/)
})
