import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('execution types and store accept agent timeline events', () => {
  const types = read('src/core/types/execution.types.ts')
  const store = read('src/features/workflow-editor/stores/execution.store.ts')

  for (const eventType of [
    'agent:model-start',
    'agent:model-end',
    'agent:tool-start',
    'agent:tool-end',
    'agent:memory-read',
    'agent:memory-write',
    'agent:approval-created',
    'agent:error',
  ]) {
    assert.match(types, new RegExp(`'${eventType}'`))
    assert.match(store, new RegExp(eventType))
  }
})

test('agent trace panel groups model, tool, memory, approval, and error events', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentTracePanel.vue')

  for (const group of ['model', 'tool', 'memory', 'approval', 'error']) {
    assert.match(source, new RegExp(group))
  }

  assert.match(source, /groupAgentEvents/)
  assert.match(source, /agentEvents/)
})

test('agent trace panel redacts secret-like fields and collapses large payloads', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentTracePanel.vue')

  assert.match(source, /redactSecretLikeFields/)
  assert.match(source, /authorization|password|secret|token|apiKey/i)
  assert.match(source, /MAX_AGENT_TRACE_PREVIEW_CHARS/)
  assert.match(source, /isPayloadLarge/)
  assert.match(source, /collapsedPayloads/)
})

test('agent trace panel displays tool failures as error state', () => {
  const source = read('src/features/workflow-editor/components/agent/AgentTracePanel.vue')

  assert.match(source, /tool failure/i)
  assert.match(source, /trace\.status === 'failed'/)
  assert.match(source, /retry/)
})

test('execution logs panel renders an agent trace section without replacing existing logs', () => {
  const source = read('src/features/workflow-editor/components/execution/ExecutionLogsPanel.vue')

  assert.match(source, /import AgentTracePanel/)
  assert.match(source, /<AgentTracePanel/)
  assert.match(source, /executionStore\.timeline/)
})
