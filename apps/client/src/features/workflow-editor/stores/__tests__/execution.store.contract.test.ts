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
  assert.match(types, /'agent:tool-retry'/)
  assert.match(source, /type EditorChatToolStatus/)
  assert.match(source, /kind: 'toolStatus'/)
  assert.match(source, /recordEditorChatToolIntent/)
  assert.match(source, /recordEditorChatToolStart/)
  assert.match(source, /recordEditorChatToolRetry/)
  assert.match(source, /recordEditorChatToolEnd/)
  assert.match(source, /case 'agent:tool-intent'/)
  assert.match(source, /case 'agent:tool-start'/)
  assert.match(source, /case 'agent:tool-retry'/)
  assert.match(source, /case 'agent:tool-end'/)
  assert.match(source, /status: 'pending'/)
  assert.match(source, /status: 'running'/)
  assert.match(source, /status: 'retrying'/)
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
  assert.match(source, /approvedToolExecutions\.has\(executionId\)/)
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

test('execution store keeps approval messages outside the streaming assistant id', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')
  const approvalBlock = source.slice(
    source.indexOf('function recordEditorChatApprovalCreated'),
    source.indexOf('function recordEditorChatJobSuccess'),
  )

  assert.match(source, /function approvalMessageId/)
  assert.match(approvalBlock, /id: approvalMessageId\(executionId, approvalId\)/)
  assert.doesNotMatch(approvalBlock, /id: streamAssistantMessageId\(executionId\)/)
})

test('execution store routes approved tool streams by execution id state', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(source, /approvedToolExecutions/)
  assert.match(source, /function approveEditorChatToolApproval/)
  assert.match(source, /approvedToolExecutions\.add\(input\.executionId\)/)
  assert.match(source, /removeEditorChatMessage\(input\.sessionId, approvalMessageId\(input\.executionId, input\.approvalId\)\)/)
  assert.match(source, /approvedToolExecutions\.has\(executionId\)/)
  assert.match(source, /approveEditorChatToolApproval,/)
})

test('execution store preserves streamed approved tool completion at agent end', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')
  const agentEndBlock = source.slice(
    source.indexOf('function recordEditorChatAgentEnd'),
    source.indexOf('function recordEditorChatJobFailure'),
  )

  assert.match(source, /hasToolCompletionTextForExecution/)
  assert.match(agentEndBlock, /hasToolCompletionTextForExecution\(chatSessionId, executionId\)/)
})

test('execution store exposes approval decline cleanup for tool chat and node statuses', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(source, /function rejectEditorChatToolApproval/)
  assert.match(source, /removeEditorChatToolStatus/)
  assert.match(source, /clearExecutionWaitingState/)
  assert.match(source, /job\.triggerNodeId/)
  assert.match(source, /rejectEditorChatToolApproval,/)
})

test('execution store routes agent tool status to the matching connected tool node', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(source, /node\?\.type === 'ai-tool'/)
  assert.match(source, /node\.pluginId === event\.pluginId/)
  assert.match(source, /node\.methodId === event\.methodId/)
  assert.match(source, /patchConnectedAgentConfigNode\(ev\.nodeId, 'tool', \{[\s\S]*\}, ev\.data\)/)
})

test('execution store preserves node statuses until explicit clear execution', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.doesNotMatch(source, /clearNodeStatusLater/)
  assert.match(source, /function resetNodeStatuses\(\)/)
})

test('execution store resets timeline stats before running a trigger in an active session', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(source, /function resetCurrentRunState\(\)[\s\S]*timeline\.value = \[\]/)
  assert.match(source, /async function executeTrigger[\s\S]*resetCurrentRunState\(\)[\s\S]*triggerStatuses\[triggerNodeId\] = 'running'/)
})

test('execution store records input and output snapshots for agent config nodes', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(source, /case 'agent:model-start':[\s\S]*input: agentPayloadValue\(ev\.data, 'input'\)/)
  assert.match(source, /case 'agent:model-end':[\s\S]*output: agentPayloadValue\(ev\.data, 'output'\) \?\? ev\.data/)
  assert.match(source, /case 'agent:memory-read':[\s\S]*case 'agent:memory-write':[\s\S]*patchConnectedAgentConfigNode\(ev\.nodeId, 'memory'/)
  assert.match(source, /case 'agent:tool-start':[\s\S]*input: agentPayloadValue\(ev\.data, 'input'\)/)
  assert.match(source, /case 'agent:tool-retry':[\s\S]*status: 'retrying'/)
})

test('execution store propagates inherited agent input to every connected config node', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(source, /case 'agent:config-snapshot':/)
  assert.match(source, /patchConnectedAgentConfigNodes\(ev\.nodeId, 'chatModel'/)
  assert.match(source, /patchConnectedAgentConfigNodes\(ev\.nodeId, 'memory'/)
  assert.match(source, /patchConnectedAgentConfigNodes\(ev\.nodeId, 'tool'/)
})
