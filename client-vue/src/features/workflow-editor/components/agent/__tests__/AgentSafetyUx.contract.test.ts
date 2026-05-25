import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('destructive side effects render danger badges', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentToolPicker.vue')

  assert.match(source, /isDestructiveSideEffect/)
  assert.match(source, /agent-tool-picker__badge--danger/)
  assert.match(source, /delete|external-payment|filesystem/)
})

test('approval-required tools cannot hide approval state', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentToolPicker.vue')

  assert.match(source, /Approval required/)
  assert.match(source, /aria-label=.*approval/i)
  assert.doesNotMatch(source, /display:\s*none[^}]*approval/i)
})

test('memory write-enabled state is visibly indicated', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentMemoryScopePicker.vue')

  assert.match(source, /agent-memory-scope-picker__write-state/)
  assert.match(source, /writeEnabled && !writeDisabled/)
  assert.match(source, /Long-term writes enabled/)
})

test('public chat trigger shows auth and rate-limit warning text', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/ChatTriggerEditor.vue')

  assert.match(source, /publicChatWarning/)
  assert.match(source, /rate limit/i)
  assert.match(source, /auth/i)
})

test('long schema previews are collapsible', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentToolPicker.vue')

  assert.match(source, /expandedSchemas/)
  assert.match(source, /toggleSchema/)
  assert.match(source, /Schema preview/)
})

test('icon-only buttons have accessible labels', () => {
  const trace = read('src/features/workflow-editor/components/agent/AgentTracePanel.vue')

  assert.match(trace, /aria-label=/)
  assert.match(trace, /togglePayload/)
})
