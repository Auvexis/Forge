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

test('chat session panel can send editor messages into an active dev session', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')
  const store = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(source, /devSessionId\?: string/)
  assert.match(source, /workflowId\?: string/)
  assert.match(source, /triggerNodeId\?: string/)
  assert.match(source, /workflowsApi/)
  assert.match(source, /useExecutionStore/)
  assert.match(source, /useWorkflowStore/)
  assert.match(source, /sendDevSessionMessage/)
  assert.match(source, /ensureFreshDevSession/)
  assert.match(source, /currentWorkflowRevision/)
  assert.match(source, /sessionWorkflowRevision/)
  assert.match(source, /workflowStore\.isDirty/)
  assert.match(source, /saveActiveWorkflow\(\{ silent: true \}\)/)
  assert.match(source, /stopDevSession/)
  assert.match(source, /executionStore\.execute/)
  assert.match(source, /executeDevSessionTrigger/)
  assert.match(source, /source: 'chat-panel'/)
  assert.match(source, /chat_dev_\$\{props\.devSessionId\}/)
  assert.match(source, /displayedDevChatSessionId/)
  assert.doesNotMatch(source, /dev-chat-/)
  assert.match(source, /displayedMessages/)
  assert.match(source, /editorChatMessagesBySession/)
  assert.match(source, /registerEditorChatExecution\(result\.executionId, localSessionId\)/)
  assert.match(store, /recordEditorChatTriggerReceived/)
  assert.match(store, /recordEditorChatNodeSuccess/)
  assert.match(store, /recordEditorChatAgentEnd/)
  assert.match(store, /recordEditorChatJobSuccess/)
  assert.match(store, /hasAssistantMessageForExecution/)
  assert.match(store, /not connected to an AI Agent yet/)
  assert.match(store, /function registerEditorChatExecution/)
  assert.match(store, /case 'agent:end'/)
  assert.match(store, /case 'agent:model-start'/)
  assert.match(store, /case 'agent:model-end'/)
  assert.match(store, /case 'agent:error'/)
  assert.match(store, /patchConnectedAgentConfigNode/)
  assert.match(store, /patchConnectedAgentConfigNode\(ev\.nodeId, 'chatModel'/)
  assert.match(store, /recordEditorChatAgentFailure/)
  assert.match(store, /agentFailuresByExecution/)
  assert.match(store, /case 'job:success'/)
  assert.match(store, /appendEditorChatMessage/)
  assert.doesNotMatch(source, /Watch the Execution panel for the agent response/)
})

test('editor chat uses agent end as the single assistant response for ai agents', () => {
  const store = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(store, /function isAiAgentNode/)
  assert.match(store, /if \(isAiAgentNode\(ev\.nodeId\)\) return/)
  assert.match(store, /recordEditorChatAgentEnd\(ev\)/)
  assert.match(store, /case 'agent:end':[\s\S]*_patchNode\(ev\.nodeId/)
})

test('editor chat renders agent output deltas into one assistant message per execution', () => {
  const store = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(store, /case 'agent:output-delta'/)
  assert.match(store, /recordEditorChatAgentOutputDelta\(ev\)/)
  assert.match(store, /function appendEditorChatMessageDelta/)
  assert.match(store, /function streamAssistantMessageId\(executionId: string\)/)
  assert.match(store, /chat-assistant-stream:\$\{executionId\}:agent/)
  assert.match(store, /appendEditorChatMessageDelta\(ev\.executionId, chatSessionId, delta, ev\.timestamp\)/)
  assert.match(store, /recordEditorChatAgentEnd[\s\S]*id: streamAssistantMessageId\(ev\.executionId\)/)
})

test('editor chat renders thinking deltas and pending assistant state', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')
  const store = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(source, /messageThinking/)
  assert.match(source, /isPendingAssistantMessage/)
  assert.match(source, /chat-session-panel__thinking/)
  assert.match(source, /chat-session-panel__typing-dots/)
  assert.match(source, /executionStore\.appendPendingEditorChatAssistantMessage/)
  assert.match(store, /case 'agent:thinking-delta'/)
  assert.match(store, /recordEditorChatAgentThinkingDelta\(ev\)/)
  assert.match(store, /function appendEditorChatThinkingDelta/)
  assert.match(store, /function appendPendingEditorChatAssistantMessage/)
})

test('chat session panel owns a custom invisible chat target selector', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /chatTriggers\?: ChatPanelTrigger\[\]/)
  assert.match(source, /selectedTriggerNodeId\?: string/)
  assert.match(source, /defineEmits<\{/)
  assert.match(source, /update:selectedTriggerNodeId/)
  assert.match(source, /chat-session-panel__target-bar/)
  assert.match(source, /chat-session-panel__target-select/)
  assert.match(source, /selectChatTrigger/)
  assert.doesNotMatch(source, /BaseSelect/)
})

test('editor chat keeps streaming status and error semantics consistent', () => {
  const store = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(store, /case 'agent:model-start':[\s\S]*patchConnectedAgentConfigNode\(ev\.nodeId, 'chatModel', \{[\s\S]*status: 'running'/)
  assert.match(store, /case 'agent:output-delta':[\s\S]*_patchNode\(ev\.nodeId, \{ status: 'running', startedAt: ev\.timestamp \}\)/)
  assert.match(store, /case 'agent:output-delta':[\s\S]*_patchExecutionNode\(ev\.executionId, ev\.nodeId, \{ status: 'running', startedAt: ev\.timestamp \}\)/)
  assert.match(store, /function hasStreamAssistantMessageForExecution/)
  assert.match(store, /recordEditorChatAgentFailure[\s\S]*hasStreamAssistantMessageForExecution\(chatSessionId, ev\.executionId\)[\s\S]*streamAssistantMessageId\(ev\.executionId\)/)
  assert.match(store, /recordEditorChatJobSuccess[\s\S]*hasAssistantMessageForExecution\(chatSessionId, ev\.executionId\)/)
})

test('editor chat stops pending assistant loading when an agent approval is requested', () => {
  const store = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(store, /function recordEditorChatApprovalCreated/)
  assert.match(store, /case 'agent:approval-created':[\s\S]*recordEditorChatApprovalCreated\(ev\)/)
  assert.match(store, /Tool approval required/)
  assert.match(store, /approvalId/)
  assert.match(store, /executionId/)
  assert.match(store, /toolName/)
  assert.match(store, /status: 'waiting'/)
  assert.match(store, /patchConnectedAgentConfigNode\(ev\.nodeId, 'tool'/)
})

test('editor chat marks connected tool failed when an approved agent tool fails', () => {
  const store = read('src/features/workflow-editor/stores/execution.store.ts')
  const errorCase = store.slice(
    store.indexOf("case 'agent:error':"),
    store.indexOf("case 'agent:approval-created':"),
  )

  assert.match(errorCase, /patchConnectedAgentConfigNode\(ev\.nodeId, 'tool', \{[\s\S]*status: 'failed'/)
})

test('editor chat renders approval accept and decline actions inline', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /approvalActions/)
  assert.match(source, /approveChatApproval/)
  assert.match(source, /rejectChatApproval/)
  assert.match(source, /approveToolCall\(/)
  assert.match(source, /rejectToolCall\(/)
  assert.match(source, /executionId: approval\.executionId/)
  assert.match(source, />\s*Accept\s*</)
  assert.match(source, />\s*Decline\s*</)
})

test('approval accept keeps chat streaming through session events', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /Approved .* Waiting for the agent response/)
  assert.doesNotMatch(source, /extractApprovalExecutionOutput/)
})

test('chat session panel renders animated agent tool status rows', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /TransitionGroup/)
  assert.match(source, /isToolStatusContent/)
  assert.match(source, /formatToolStatusMessage/)
  assert.match(source, /detectChatLocale/)
  assert.match(source, /chat-session-panel__tool-status/)
  assert.match(source, /chat-session-panel__tool-status--running/)
  assert.match(source, /chat-session-panel__tool-dots/)
  assert.match(source, /@keyframes chat-tool-shimmer/)
  assert.match(source, /chat-message-enter-active/)
})

test('chat session panel excludes transient tool status rows from llm history', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /!isToolStatusContent\(message\.content\)/)
  assert.match(source, /messageContent[\s\S]*isToolStatusContent/)
})

test('chat session panel autoscrolls when streamed content changes', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /displayedMessagesScrollKey/)
  assert.match(source, /JSON\.stringify\(displayedMessages\.value\.map/)
  assert.match(source, /watch\(\s*displayedMessagesScrollKey/)
})

test('chat session panel renders user and assistant messages', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /messages/)
  assert.match(source, /message\.role/)
  assert.match(source, /assistantResponse/)
  assert.match(source, /chat-session-panel__avatar/)
  assert.match(source, /message\.role === 'user' \? 'user' : 'bot'/)
  assert.match(source, /chat-session-panel__message-copy/)
  assert.doesNotMatch(source, /chat-session-panel__header/)
  assert.doesNotMatch(source, /chat-session-panel__session/)
  assert.doesNotMatch(source, /var\(--sailor-blue-400\) 10%/)
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

test('chat session panel uses a modern inline composer with keyboard submit', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.doesNotMatch(source, /BaseTextarea/)
  assert.match(source, /chat-session-panel__composer-shell/)
  assert.match(source, /@keydown\.ctrl\.enter\.prevent="sendCurrentMessage"/)
  assert.match(source, /LucideIcon/)
  assert.match(source, /name="send/)
})

test('chat session panel keeps composer below a message-only scroll region', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')
  const composerIndex = source.indexOf('chat-session-panel__composer')
  const messagesIndex = source.indexOf('chat-session-panel__messages')

  assert.notEqual(composerIndex, -1)
  assert.notEqual(messagesIndex, -1)
  assert.equal(messagesIndex < composerIndex, true)
  assert.match(source, /ref="messagesEl"/)
  assert.match(source, /scrollMessagesToBottom/)
  assert.match(source, /await nextTick\(\)/)
  assert.match(source, /overflow-y: auto/)
})

test('chat session panel supports chrome speech to text with listening state', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /SpeechRecognition/)
  assert.match(source, /webkitSpeechRecognition/)
  assert.match(source, /isListening/)
  assert.match(source, /startSpeechToText/)
  assert.match(source, /chat-session-panel__icon-button--listening/)
  assert.match(source, /name="mic/)
})

test('chat session panel keeps speech to text active until user toggles it off', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /recognition\.continuous = true/)
  assert.match(source, /keepRecognitionAlive/)
  assert.match(source, /event\.resultIndex/)
  assert.match(source, /activeRecognition\.stop\(\)/)
  assert.match(source, /keepRecognitionAlive = false/)
})

test('chat session panel reports explanatory send errors in global toast', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /useToast/)
  assert.match(source, /toast\.error/)
  assert.match(source, /ApiError/)
  assert.match(source, /formatSendError/)
  assert.doesNotMatch(source, /Unable to send message\./)
})
