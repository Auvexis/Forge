import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

test('workflow editor no longer runs the legacy event-driven chat panel', () => {
  const source = readFileSync(
    resolve(root, 'src/features/workflow-editor/components/agent/WorkflowChatBottomPanel.vue'),
    'utf8',
  )

  assert.match(source, /Agent chats moved/)
  assert.match(source, /type: 'agents\.open'/)
  assert.doesNotMatch(source, /to="\/agents"/)
  assert.doesNotMatch(source, /ChatSessionPanel|useExecutionStore|EventSource|agentChatApi/)
})
