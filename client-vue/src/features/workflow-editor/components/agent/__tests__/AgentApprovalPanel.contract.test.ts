import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('approval panel shows pending tool approval context', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentApprovalPanel.vue')

  assert.match(source, /toolName/)
  assert.match(source, /sideEffect/)
  assert.match(source, /sanitizedArgs/)
  assert.match(source, /pending/i)
})

test('approval panel approves and rejects through agent chat api', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentApprovalPanel.vue')

  assert.match(source, /agentChatApi/)
  assert.match(source, /approveToolCall\(/)
  assert.match(source, /rejectToolCall\(/)
  assert.match(source, /reason/)
})

test('approval panel redacts credentials and emits trace refresh after resolution', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentApprovalPanel.vue')

  assert.match(source, /redactSecretLikeFields/)
  assert.match(source, /authorization|password|secret|token|apiKey/i)
  assert.match(source, /defineEmits/)
  assert.match(source, /refreshTrace/)
})

test('agent trace panel can render approval panel for approval events', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentTracePanel.vue')

  assert.match(source, /import AgentApprovalPanel/)
  assert.match(source, /<AgentApprovalPanel/)
  assert.match(source, /approvalId/)
  assert.match(source, /@refresh-trace/)
})
