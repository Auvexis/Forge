import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('chat session panel sends messages through agent chat api', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /agentChatApi/)
  assert.match(source, /sendMessage\(/)
  assert.match(source, /sendCurrentMessage/)
})

test('chat session panel renders user and assistant messages', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /messages/)
  assert.match(source, /message\.role/)
  assert.match(source, /assistantResponse/)
})

test('chat session panel preserves session id for follow-up messages', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /sessionId/)
  assert.match(source, /result\.session\.id/)
  assert.match(source, /sessionId: sessionId\.value/)
})

test('chat session panel disables send while pending and shows safe errors', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /pending/)
  assert.match(source, /:disabled=.*pending/)
  assert.match(source, /safeError/)
  assert.doesNotMatch(source, /stack/)
})
