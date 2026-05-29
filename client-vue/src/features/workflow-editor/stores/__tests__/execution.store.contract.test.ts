import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('execution store maps agent tool lifecycle events to transient chat status records', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')
  const types = read('src/core/types/execution.types.ts')

  assert.match(types, /'agent:tool-intent'/)
  assert.match(source, /type EditorChatToolStatus/)
  assert.match(source, /kind: 'toolStatus'/)
  assert.match(source, /recordEditorChatToolIntent/)
  assert.match(source, /recordEditorChatToolStart/)
  assert.match(source, /recordEditorChatToolEnd/)
  assert.match(source, /case 'agent:tool-intent'/)
  assert.match(source, /case 'agent:tool-start'/)
  assert.match(source, /case 'agent:tool-end'/)
  assert.match(source, /status: 'pending'/)
  assert.match(source, /status: 'running'/)
  assert.match(source, /extractToolStatusPayload\(ev, eventStatus\)/)
})

test('execution store updates one tool status row across approval resume events', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(source, /function toolStatusMessageId/)
  assert.match(source, /chat-tool-status:\$\{status\.executionId\}:\$\{status\.toolName\}/)
  assert.doesNotMatch(source, /chat-tool-status:\$\{status\.executionId\}:\$\{status\.callId/)
})

test('execution store appends a fallback tool completion message only when model output is empty', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')
  const completionBlock = source.slice(
    source.indexOf('function appendToolCompletionMessage'),
    source.indexOf('function appendFinalAssistantMessage'),
  )

  assert.match(source, /appendToolCompletionMessage/)
  assert.match(source, /toolCompletionMessageId/)
  assert.match(source, /chat-assistant-tool-completion:\$\{executionId\}/)
  assert.doesNotMatch(completionBlock, /id: streamAssistantMessageId\(executionId\)/)
  assert.match(completionBlock, /id: toolCompletionMessageId\(executionId\)/)
  assert.match(source, /lastSuccessfulToolByExecution/)
  assert.match(source, /hasAssistantTextForExecution/)
  assert.match(source, /isApprovalContinuationContent/)
  assert.match(source, /formatToolCompletionMessage/)
})

test('execution store keeps approval continuation and appends final agent text below it', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(source, /isApprovalContinuationContent\(existing\?\.content\)/)
  assert.match(source, /appendFinalAssistantMessage/)
  assert.match(source, /toolCompletionMessageId\(executionId\)/)
})

test('execution store redirects post-approval stream deltas below the tool status row', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')
  const deltaBlock = source.slice(
    source.indexOf('function appendEditorChatMessageDelta'),
    source.indexOf('function appendEditorChatThinkingDelta'),
  )

  assert.match(source, /function assistantStreamTargetMessageId/)
  assert.match(deltaBlock, /assistantStreamTargetMessageId\(executionId, sessionId\)/)
  assert.doesNotMatch(deltaBlock, /id = streamAssistantMessageId\(executionId\)/)
})
