import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('memory scope picker exposes all supported scopes', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentMemoryScopePicker.vue')

  for (const scope of ['none', 'session', 'workflow', 'profile', 'user']) {
    assert.match(source, new RegExp(`value: '${scope}'`))
  }
})

test('memory scope picker disables writes for none and session scopes', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentMemoryScopePicker.vue')

  assert.match(source, /writeDisabled/)
  assert.match(source, /props\.scope === 'none'/)
  assert.match(source, /props\.scope === 'session'/)
  assert.match(source, /disabled=.*writeDisabled/)
})

test('memory admin panel lists and deletes memories through api', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentMemoryAdminPanel.vue')

  assert.match(source, /agentToolsApi/)
  assert.match(source, /listMemory\(/)
  assert.match(source, /deleteMemory\(/)
  assert.match(source, /loadMemories/)
  assert.match(source, /removeMemory/)
})

test('memory admin panel truncates memory value previews', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentMemoryAdminPanel.vue')

  assert.match(source, /memoryValuePreview/)
  assert.match(source, /MAX_MEMORY_PREVIEW_CHARS/)
  assert.match(source, /slice\(0, MAX_MEMORY_PREVIEW_CHARS\)/)
})

test('ai memory editor uses memory scope picker without auto-opening admin ui', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiMemoryEditor.vue')

  assert.match(source, /import AgentMemoryScopePicker/)
  assert.match(source, /<AgentMemoryScopePicker/)
  assert.doesNotMatch(source, /AgentMemoryAdminPanel/)
})
