<template>
  <section class="chat-session-panel">
    <div ref="messagesEl" class="chat-session-panel__messages">
      <TransitionGroup name="chat-message" tag="div" class="chat-session-panel__message-list">
        <article
          v-for="message in visibleMessages"
          :key="message.id"
          class="chat-session-panel__message"
          :data-role="message.role"
        >
          <div class="chat-session-panel__avatar" aria-hidden="true">
            {{ messageAvatar(message) }}
          </div>
          <div class="chat-session-panel__message-copy">
            <strong>
              <span>{{ messageDisplayName(message) }}</span>
              <time>{{ formatMessageTime(message) }}</time>
            </strong>
            <template v-if="isToolStatusContent(message.content)">
              <div
                class="chat-session-panel__tool-status"
                :class="`chat-session-panel__tool-status--${message.content.status}`"
              >
                <div class="chat-session-panel__tool-status-copy">
                  <span>{{ formatToolStatusLabel(message.content) }}</span>
                  <p>{{ formatToolStatusMessage(message.content) }}</p>
                </div>
                <div
                  v-if="message.content.status === 'pending' || message.content.status === 'running' || message.content.status === 'retrying'"
                  class="chat-session-panel__tool-dots"
                  aria-hidden="true"
                >
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div
                v-if="toolStatusCompletionText(message.content)"
                class="chat-session-panel__tool-final-reply"
              >
                <p>{{ toolStatusCompletionText(message.content) }}</p>
              </div>
            </template>
            <template v-else>
              <div v-if="messageThinking(message.content)" class="chat-session-panel__thinking">
                {{ messageThinking(message.content) }}
              </div>
              <div v-if="isPendingAssistantMessage(message)" class="chat-session-panel__typing-dots" aria-label="Agent is thinking">
                <span />
                <span />
                <span />
              </div>
              <p v-else>{{ messageContent(message.content) }}</p>
              <div v-if="approvalActions(message.content)" class="chat-session-panel__approval-actions">
                <button
                  type="button"
                  class="chat-session-panel__approval-button"
                  :disabled="approvalPendingId === approvalActions(message.content)?.approvalId"
                  @click="rejectChatApproval(approvalActions(message.content)!)"
                >
                  Decline
                </button>
                <button
                  type="button"
                  class="chat-session-panel__approval-button chat-session-panel__approval-button--primary"
                  :disabled="approvalPendingId === approvalActions(message.content)?.approvalId"
                  @click="approveChatApproval(approvalActions(message.content)!)"
                >
                  Accept
                </button>
              </div>
            </template>
          </div>
        </article>
      </TransitionGroup>

      <div v-if="!displayedMessages.length" class="chat-session-panel__empty">No messages yet.</div>
    </div>

    <div v-if="selectedTrigger?.chatSlug" class="chat-session-panel__target-bar">
      <span class="chat-session-panel__target-kind">Dev Session</span>
      <button
        type="button"
        class="chat-session-panel__target-select"
        :disabled="chatTriggers.length <= 1"
        aria-haspopup="listbox"
        :aria-expanded="targetMenuOpen"
        @click="targetMenuOpen = chatTriggers.length > 1 && !targetMenuOpen"
      >
        <span>{{ selectedTrigger.title || 'Agent Chat' }}</span>
        <code>{{ selectedTrigger.chatSlug }}</code>
        <LucideIcon v-if="chatTriggers.length > 1" name="chevron-down" :size="13" />
      </button>

      <div v-if="targetMenuOpen" class="chat-session-panel__target-menu" role="listbox">
        <button
          v-for="trigger in chatTriggers"
          :key="trigger.triggerNodeId"
          type="button"
          class="chat-session-panel__target-option"
          :class="{ 'chat-session-panel__target-option--active': trigger.triggerNodeId === selectedTrigger.triggerNodeId }"
          role="option"
          :aria-selected="trigger.triggerNodeId === selectedTrigger.triggerNodeId"
          @click="selectChatTrigger(trigger.triggerNodeId)"
        >
          <span>{{ trigger.title || 'Agent Chat' }}</span>
          <code>{{ trigger.chatSlug || 'no slug' }}</code>
        </button>
      </div>
    </div>

    <div v-if="!canSendToDevSession" class="chat-session-panel__published-boundary">
      <span>Published agent chat lives in the global panel.</span>
      <button type="button" @click="openPublishedAgentPanel">
        Open published agent panel
      </button>
    </div>

    <form class="chat-session-panel__composer" @submit.prevent="sendCurrentMessage">
      <div class="chat-session-panel__composer-shell">
        <textarea
          v-model="draft"
          class="chat-session-panel__input"
          :disabled="pending || !canSendToDevSession"
          placeholder="Ask the agent..."
          aria-label="Chat message"
          rows="2"
          @keydown.ctrl.enter.prevent="sendCurrentMessage"
        />

        <div class="chat-session-panel__composer-actions">
          <button
            type="button"
            class="chat-session-panel__icon-button"
            :class="{ 'chat-session-panel__icon-button--listening': isListening }"
            :disabled="pending || !speechSupported || !canSendToDevSession"
            :title="speechSupported ? 'Dictate with Chrome speech recognition' : 'Speech recognition is not available'"
            aria-label="Dictate message"
            @click="startSpeechToText"
          >
            <LucideIcon v-if="isListening" name="mic-off" :size="15" />
            <LucideIcon v-else name="mic" :size="15" />
          </button>

          <button
            type="submit"
            class="chat-session-panel__send"
            :disabled="!canSend || pending"
            title="Send message with Ctrl+Enter"
            aria-label="Send message"
          >
            <LucideIcon v-if="pending" name="loader-2" :size="15" class="chat-session-panel__spin" />
            <LucideIcon v-else name="send" :size="15" />
          </button>
        </div>
      </div>

      <span v-if="safeError" class="chat-session-panel__error">{{ safeError }}</span>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { agentChatApi } from '@/core/api/agent-chat.api'
import { workflowsApi } from '@/core/api/workflows.api'
import { ApiError } from '@/core/types/api.types'
import type { AgentChatMessage, AgentChatMessageRole } from '@/features/agent-runtime/types/agent.types'
import { useExecutionStore } from '@/features/workflow-editor/stores/execution.store'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { useAgentPanelUiStore } from '@/features/agent-panel/stores/agentPanelUi.store'
import { useProfileStore } from '@/shared/stores/profile.store'
import { useToast } from '@/shared/composables/useToast'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

export interface ChatPanelTrigger {
  triggerNodeId: string
  chatSlug?: string
  title?: string
  agentDisplayName?: string
  agentEmoji?: string
}

const props = withDefaults(
  defineProps<{
    chatSlug: string
    title?: string
    workflowId?: string
    triggerNodeId?: string
    devSessionId?: string
    chatTriggers?: ChatPanelTrigger[]
    selectedTriggerNodeId?: string
  }>(),
  {
    title: 'Agent Chat',
    chatTriggers: () => [],
  },
)

const emit = defineEmits<{
  'update:selectedTriggerNodeId': [triggerNodeId: string]
}>()

const draft = ref('')
const pending = ref(false)
const safeError = ref('')
const sessionId = ref<string | undefined>()
const messages = ref<AgentChatMessage[]>([])
const messagesEl = ref<HTMLElement | null>(null)
const isListening = ref(false)
const targetMenuOpen = ref(false)
const approvalPendingId = ref<string | null>(null)
const toast = useToast()
const agentPanelUi = useAgentPanelUiStore()
const profileStore = useProfileStore()
const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()
const sessionWorkflowRevision = ref<string | undefined>()

const fallbackTrigger = computed<ChatPanelTrigger | null>(() => {
  if (!props.chatSlug) return null
  return {
    triggerNodeId: props.triggerNodeId || 'trigger',
    chatSlug: props.chatSlug,
    title: props.title,
  }
})
const chatTriggers = computed(() => props.chatTriggers.length ? props.chatTriggers : fallbackTrigger.value ? [fallbackTrigger.value] : [])
const selectedTrigger = computed(() =>
  chatTriggers.value.find((trigger) => trigger.triggerNodeId === props.selectedTriggerNodeId) ??
  chatTriggers.value.find((trigger) => trigger.triggerNodeId === props.triggerNodeId) ??
  chatTriggers.value[0] ??
  null,
)
const activeTriggerNodeId = computed(() => selectedTrigger.value?.triggerNodeId ?? props.triggerNodeId)
const activeChatSlug = computed(() => selectedTrigger.value?.chatSlug ?? props.chatSlug)
const canSendToDevSession = computed(
  () => Boolean(props.workflowId && activeTriggerNodeId.value && props.devSessionId),
)
const canSend = computed(() => canSendToDevSession.value && draft.value.trim().length > 0)
const devChatSessionId = computed(() => props.devSessionId ? `chat_dev_${props.devSessionId}` : undefined)
const displayedDevChatSessionId = computed(() => canSendToDevSession.value ? sessionId.value : undefined)
const displayedMessages = computed(() => {
  if (!canSendToDevSession.value || !displayedDevChatSessionId.value) return messages.value
  return executionStore.editorChatMessagesBySession[displayedDevChatSessionId.value] ?? []
})
const visibleMessages = computed(() =>
  displayedMessages.value.filter((message) => !isToolCompletionMessage(message)),
)
const displayedMessagesScrollKey = computed(() => JSON.stringify(displayedMessages.value.map((message) => ({
  id: message.id,
  role: message.role,
  text: messageContent(message.content),
  thinking: messageThinking(message.content),
  pending: isPendingAssistantMessage(message),
  toolStatus: isToolStatusContent(message.content) ? message.content.status : '',
  approvalId: approvalActions(message.content)?.approvalId ?? '',
}))))
const currentWorkflowRevision = computed(() => {
  const workflow = workflowStore.activeWorkflow
  return JSON.stringify({
    nodes: workflow?.nodes ?? {},
    edges: workflow?.edges ?? [],
  })
})
const speechSupported = computed(() => getSpeechRecognitionCtor() !== null)

watch(
  devChatSessionId,
  (nextSessionId) => {
    if (canSendToDevSession.value && nextSessionId) {
      sessionId.value = nextSessionId
      sessionWorkflowRevision.value = currentWorkflowRevision.value
    }
  },
  { immediate: true },
)

watch(
  displayedMessagesScrollKey,
  () => {
    void scrollMessagesToBottom()
  },
)

type BrowserSpeechRecognitionEvent = {
  resultIndex?: number
  results: ArrayLike<{
    isFinal?: boolean
    0?: {
      transcript?: string
    }
  }>
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  start: () => void
  stop: () => void
}

type ChatApprovalAction = {
  approvalId: string
  executionId: string
  toolName: string
}

type EditorChatToolStatus = {
  kind: 'toolStatus'
  executionId: string
  callId?: string
  toolName: string
  pluginName?: string
  status: 'pending' | 'running' | 'retrying' | 'success' | 'failed'
  requiresApproval?: boolean
  error?: string
}

let activeRecognition: BrowserSpeechRecognition | null = null
let keepRecognitionAlive = false

async function sendCurrentMessage() {
  const message = draft.value.trim()
  if (!message || pending.value) return

  pending.value = true
  safeError.value = ''

  try {
    if (canSendToDevSession.value) {
      await sendDevSessionMessage(message)
      return
    }

    safeError.value = 'Open published agent panel to chat with published agents.'
  } catch (error) {
    safeError.value = formatSendError(error)
    toast.error(safeError.value, 'Chat message failed')
  } finally {
    pending.value = false
  }
}

function openPublishedAgentPanel() {
  agentPanelUi.open()
}

async function sendDevSessionMessage(message: string) {
  const devSessionId = await ensureFreshDevSession()
  if (!devSessionId) throw new Error('Chat dev session is not available.')
  const localSessionId = sessionId.value ?? (devSessionId ? `chat_dev_${devSessionId}` : devChatSessionId.value) ?? `chat_dev_${props.devSessionId}`
  sessionId.value = localSessionId

  const result = await workflowsApi.executeDevSessionTrigger(devSessionId!, activeTriggerNodeId.value!, {
    type: 'chat',
    source: 'chat-panel',
    workflowId: props.workflowId,
    triggerNodeId: activeTriggerNodeId.value,
    chatSlug: activeChatSlug.value,
    sessionId: localSessionId,
    message,
    messages: buildDevSessionHistory(localSessionId),
  })

  executionStore.registerEditorChatExecution(result.executionId, localSessionId)
  executionStore.appendEditorChatMessage({
    id: `chat-user:${result.executionId}`,
    sessionId: localSessionId,
    role: 'user',
    content: message,
  })
  executionStore.appendPendingEditorChatAssistantMessage(result.executionId, localSessionId)
  draft.value = ''
  await scrollMessagesToBottom()
}

async function ensureFreshDevSession() {
  let devSessionId = executionStore.activeSessionId ?? props.devSessionId
  const graphChanged = sessionWorkflowRevision.value !== currentWorkflowRevision.value
  if (!devSessionId || (!workflowStore.isDirty && !graphChanged)) return devSessionId

  if (workflowStore.isDirty) {
    await workflowStore.saveActiveWorkflow({ silent: true })
    if (workflowStore.isDirty) throw new Error('Save the workflow before sending a chat message.')
  }

  await workflowsApi.stopDevSession(devSessionId).catch(() => undefined)
  await executionStore.execute(props.workflowId!, {}, undefined)
  devSessionId = executionStore.activeSessionId ?? undefined
  sessionWorkflowRevision.value = currentWorkflowRevision.value
  sessionId.value = devSessionId ? `chat_dev_${devSessionId}` : undefined
  return devSessionId
}

function startSpeechToText() {
  if (isListening.value && activeRecognition) {
    keepRecognitionAlive = false
    activeRecognition.stop()
    return
  }

  const Recognition = getSpeechRecognitionCtor()
  if (!Recognition) {
    safeError.value = 'Speech recognition is only available in supported Chrome-based browsers.'
    return
  }

  const recognition = new Recognition()
  activeRecognition = recognition
  keepRecognitionAlive = true
  recognition.continuous = true
  recognition.interimResults = false
  recognition.lang = navigator.language || 'en-US'
  isListening.value = true

  recognition.onresult = (event) => {
    const resultIndex = event.resultIndex ?? 0
    const transcript = Array.from(event.results)
      .slice(resultIndex)
      .filter((result) => result.isFinal !== false)
      .map((result) => result[0]?.transcript?.trim() ?? '')
      .filter(Boolean)
      .join(' ')

    if (transcript) appendTranscript(transcript)
  }

  recognition.onerror = (event) => {
    if (event.error && event.error !== 'no-speech') {
      keepRecognitionAlive = false
    }

    safeError.value = event.error
      ? `Speech recognition stopped: ${event.error}.`
      : 'Speech recognition stopped before receiving audio.'
  }

  recognition.onend = () => {
    if (keepRecognitionAlive && activeRecognition === recognition) {
      try {
        recognition.start()
        return
      } catch {
        keepRecognitionAlive = false
      }
    }

    isListening.value = false
    activeRecognition = null
  }

  recognition.start()
}

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === 'undefined') return null

  const speechWindow = window as typeof window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

function appendTranscript(transcript: string) {
  draft.value = [draft.value.trim(), transcript.trim()].filter(Boolean).join(' ')
}

function selectChatTrigger(triggerNodeId: string) {
  targetMenuOpen.value = false
  emit('update:selectedTriggerNodeId', triggerNodeId)
}

async function approveChatApproval(approval: ChatApprovalAction) {
  approvalPendingId.value = approval.approvalId
  safeError.value = ''
  try {
    await agentChatApi.approveToolCall(approval.approvalId, {
      executionId: approval.executionId,
    })
    resolveApprovedToolMessage(approval)
  } catch (error) {
    safeError.value = formatSendError(error)
    toast.error(safeError.value, 'Approval failed')
  } finally {
    approvalPendingId.value = null
  }
}

async function rejectChatApproval(approval: ChatApprovalAction) {
  approvalPendingId.value = approval.approvalId
  safeError.value = ''
  try {
    await agentChatApi.rejectToolCall(approval.approvalId, {
      executionId: approval.executionId,
    })
    updateApprovalChatMessage(approval, `Declined ${approval.toolName}.`)
    if (canSendToDevSession.value && sessionId.value) {
      executionStore.rejectEditorChatToolApproval({
        sessionId: sessionId.value,
        executionId: approval.executionId,
        toolName: approval.toolName,
      })
    }
  } catch (error) {
    safeError.value = formatSendError(error)
    toast.error(safeError.value, 'Approval failed')
  } finally {
    approvalPendingId.value = null
  }
}

async function scrollMessagesToBottom() {
  await nextTick()
  const el = messagesEl.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

function formatSendError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.statusCode === 0) {
      return 'Chat request failed because Fabric could not reach the server. Check that the app is running and try again.'
    }

    if (error.statusCode === 404) {
      return `Chat trigger "${activeChatSlug.value}" was not found. Confirm the chat slug in the trigger settings and try again.`
    }

    const detail = error.serverError && error.serverError !== error.message ? error.serverError : error.message
    return `Chat request failed (${error.statusCode}). ${detail}`
  }

  if (error instanceof Error && error.message) {
    return `Chat request failed. ${error.message}`
  }

  return 'Chat request failed before the message could be sent.'
}

onBeforeUnmount(() => {
  keepRecognitionAlive = false
  activeRecognition?.stop()
})

function updateApprovalChatMessage(
  approval: ChatApprovalAction,
  text: unknown,
  options: { approvalContinuation?: boolean } = {},
) {
  const targetSessionId = sessionId.value
  const content = {
    text: typeof text === 'string' ? text : JSON.stringify(text),
    pending: false,
    approvalId: approval.approvalId,
    executionId: approval.executionId,
    toolName: approval.toolName,
    resolved: true,
    approvalContinuation: options.approvalContinuation === true,
  }

  if (canSendToDevSession.value && targetSessionId) {
    if (options.approvalContinuation === true) {
      executionStore.approveEditorChatToolApproval({
        sessionId: targetSessionId,
        executionId: approval.executionId,
        approvalId: approval.approvalId,
        toolName: approval.toolName,
      })
      return
    }

    executionStore.appendEditorChatMessage({
      id: `chat-assistant-stream:${approval.executionId}:agent`,
      sessionId: targetSessionId,
      role: 'assistant',
      content,
    })
    return
  }

  messages.value = messages.value.map((message) =>
    approvalActions(message.content)?.approvalId === approval.approvalId
      ? { ...message, content }
      : message,
  )
}

function resolveApprovedToolMessage(approval: ChatApprovalAction) {
  if (canSendToDevSession.value && sessionId.value) {
    executionStore.approveEditorChatToolApproval({
      sessionId: sessionId.value,
      executionId: approval.executionId,
      approvalId: approval.approvalId,
      toolName: approval.toolName,
    })
    return
  }

  updateApprovalChatMessage(
    approval,
    `Approved ${approval.toolName}. Waiting for the agent response...`,
    { approvalContinuation: true },
  )
}

function buildDevSessionHistory(chatSessionId: string) {
  return (executionStore.editorChatMessagesBySession[chatSessionId] ?? [])
    .filter((message) =>
      (message.role === 'user' || message.role === 'assistant') &&
      !isPendingAssistantMessage(message) &&
      !isToolStatusContent(message.content),
    )
    .map((message) => ({
      role: message.role,
      content: messageContent(message.content),
    }))
    .filter((message) => message.content.trim())
    .slice(-20)
}

function messageContent(content: unknown) {
  if (isToolStatusContent(content)) return ''
  if (isChatContentRecord(content)) {
    return content.text || ''
  }
  return typeof content === 'string' ? content : JSON.stringify(content)
}

function approvalActions(content: unknown): ChatApprovalAction | null {
  if (!isChatContentRecord(content) || content.resolved === true) return null
  if (typeof content.approvalId !== 'string' || !content.approvalId) return null
  if (typeof content.executionId !== 'string' || !content.executionId) return null

  return {
    approvalId: content.approvalId,
    executionId: content.executionId,
    toolName: typeof content.toolName === 'string' && content.toolName
      ? content.toolName
      : 'agent tool',
  }
}

function messageThinking(content: unknown) {
  if (isToolStatusContent(content)) return ''
  return isChatContentRecord(content) ? content.thinking || '' : ''
}

function isPendingAssistantMessage(message: AgentChatMessage) {
  if (message.role !== 'assistant') return false
  if (isChatContentRecord(message.content)) return message.content.pending === true && !message.content.text
  return typeof message.content === 'string' && message.content === '' && message.id.startsWith('chat-assistant-stream:')
}

function isChatContentRecord(content: unknown): content is {
  text?: string
  thinking?: string
  pending?: boolean
  approvalId?: unknown
  executionId?: unknown
  toolName?: unknown
  resolved?: unknown
  approvalContinuation?: unknown
} {
  return Boolean(content && typeof content === 'object' && !Array.isArray(content))
}

function isToolStatusContent(content: unknown): content is EditorChatToolStatus {
  return Boolean(content && typeof content === 'object' && !Array.isArray(content) && (content as { kind?: unknown }).kind === 'toolStatus')
}

function isToolCompletionMessage(message: AgentChatMessage) {
  return message.role === 'assistant' && message.id.startsWith('chat-assistant-tool-completion:')
}

function toolStatusCompletionText(status: EditorChatToolStatus) {
  const completion = displayedMessages.value.find((message) =>
    message.id === `chat-assistant-tool-completion:${status.executionId}`,
  )
  return completion ? messageContent(completion.content) : ''
}

function formatToolStatusLabel(status: EditorChatToolStatus) {
  if (status.status === 'success') return 'Tool completed'
  if (status.status === 'failed') return 'Tool failed'
  if (status.status === 'retrying') return 'Retrying tool'
  if (status.status === 'running') return 'Using tool'
  return 'Tool planned'
}

function formatToolStatusMessage(status: EditorChatToolStatus) {
  const tool = status.pluginName ? `${status.toolName} (${status.pluginName})` : status.toolName

  if (status.status === 'success') return `${tool} completed.`
  if (status.status === 'failed') return `${tool} failed${status.error ? `: ${status.error}` : '.'}`
  if (status.status === 'retrying') return `Retrying ${tool}.`
  if (status.status === 'running') return `Using ${tool}.`
  return status.requiresApproval
    ? `Preparing to use ${tool}. Waiting for approval.`
    : `Preparing to use ${tool}.`
}

function formatRole(role: AgentChatMessageRole) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function messageDisplayName(message: AgentChatMessage) {
  if (message.role === 'user') return profileStore.currentProfile?.name ?? 'User'
  if (message.role === 'assistant') return selectedTrigger.value?.agentDisplayName || selectedTrigger.value?.title || 'Assistant'
  return formatRole(message.role)
}

function messageAvatar(message: AgentChatMessage) {
  if (message.role === 'user') return profileStore.currentProfile?.avatarEmoji ?? 'U'
  if (message.role === 'assistant') return selectedTrigger.value?.agentEmoji || '🤖'
  return '•'
}

function formatMessageTime(message: AgentChatMessage) {
  const raw = (message as { createdAt?: string; timestamp?: string }).createdAt ?? (message as { timestamp?: string }).timestamp
  const date = raw ? new Date(raw) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)
}
</script>

<style scoped>
.chat-session-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: var(--fabric-space-3);
}

.chat-session-panel__composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-3);
}

.chat-session-panel__target-bar {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--fabric-space-2);
  min-height: 18px;
}

.chat-session-panel__target-kind {
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-text-muted);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  padding: 3px 5px;
  text-transform: uppercase;
}

.chat-session-panel__target-select {
  display: inline-flex;
  max-width: min(420px, 100%);
  align-items: center;
  gap: var(--fabric-space-2);
  overflow: hidden;
  border: 0;
  background: transparent;
  color: var(--fabric-text-muted);
  cursor: pointer;
  font-size: 11px;
  line-height: 1.2;
  padding: 0;
}

.chat-session-panel__target-select:disabled {
  cursor: default;
}

.chat-session-panel__target-select span,
.chat-session-panel__target-option span {
  color: var(--fabric-text-primary);
  font-weight: 700;
}

.chat-session-panel__target-select code,
.chat-session-panel__target-option code {
  overflow: hidden;
  font-family: var(--fabric-font-mono);
  font-size: 10px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-session-panel__target-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + var(--fabric-space-2));
  z-index: var(--fabric-z-raised);
  display: flex;
  min-width: 240px;
  flex-direction: column;
  gap: 1px;
  border: 1px solid var(--fabric-border);
  background: var(--fabric-bg-elevated);
  box-shadow: var(--fabric-shadow-lg);
}

.chat-session-panel__target-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-3);
  border: 0;
  background: transparent;
  color: var(--fabric-text-muted);
  cursor: pointer;
  padding: 7px 9px;
  text-align: left;
}

.chat-session-panel__target-option:hover,
.chat-session-panel__target-option--active {
  background: var(--fabric-bg-surface);
  color: var(--fabric-text-primary);
}

.chat-session-panel__empty,
.chat-session-panel__error {
  font-size: var(--fabric-text-xs);
}

.chat-session-panel__empty {
  color: var(--fabric-text-muted);
}

.chat-session-panel__published-boundary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-2);
  border: 1px solid var(--fabric-border);
  background: var(--fabric-bg-surface);
  padding: 8px 10px;
}

.chat-session-panel__published-boundary span {
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.chat-session-panel__published-boundary button {
  border: 1px solid var(--fabric-border-strong);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-inverse);
  color: var(--fabric-text-inverse);
  cursor: pointer;
  font-size: var(--fabric-text-xs);
  font-weight: 700;
  padding: 7px 10px;
}

.chat-session-panel__messages {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow-y: auto;
  padding-right: var(--fabric-space-1);
}

.chat-session-panel__message-list {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-4);
}

.chat-session-panel__message {
  display: flex;
  align-items: flex-start;
  gap: var(--fabric-space-2);
  width: 100%;
  max-width: min(760px, 96%);
  padding: 2px 0;
}

.chat-session-panel__message[data-role='user'] {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.chat-session-panel__message[data-role='assistant'] {
  align-self: flex-start;
}

.chat-session-panel__avatar {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--fabric-border);
  border-radius: 999px;
  background: var(--fabric-bg-elevated);
  color: var(--fabric-text-secondary);
}

.chat-session-panel__message[data-role='assistant'] .chat-session-panel__avatar {
  border-color: color-mix(in srgb, var(--fabric-green-400) 28%, var(--fabric-border));
  color: var(--fabric-green-400);
}

.chat-session-panel__message[data-role='user'] .chat-session-panel__avatar {
  border-color: color-mix(in srgb, var(--fabric-text-muted) 35%, var(--fabric-border));
}

.chat-session-panel__message-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.chat-session-panel__message[data-role='user'] .chat-session-panel__message-copy {
  align-items: flex-end;
  text-align: right;
}

.chat-session-panel__message-copy strong,
.chat-session-panel__message-copy p {
  margin: 0;
}

.chat-session-panel__message-copy strong {
  display: inline-flex;
  align-items: baseline;
  gap: var(--fabric-space-2);
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-sm);
  font-weight: 700;
}

.chat-session-panel__message-copy time {
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-medium);
}

.chat-session-panel__message-copy p {
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-sm);
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-session-panel__thinking {
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-session-panel__tool-status {
  position: relative;
  display: flex;
  width: min(420px, 100%);
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-3);
  overflow: hidden;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-surface);
  padding: 8px 10px;
}

.chat-session-panel__tool-status--pending,
.chat-session-panel__tool-status--running,
.chat-session-panel__tool-status--retrying {
  border-color: color-mix(in srgb, var(--fabric-amber-400) 34%, var(--fabric-border));
}

.chat-session-panel__tool-status--pending::before,
.chat-session-panel__tool-status--running::before,
.chat-session-panel__tool-status--retrying::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--fabric-amber-400) 12%, transparent) 46%,
    transparent 100%
  );
  animation: chat-tool-shimmer 1.6s ease-in-out infinite;
  content: '';
  pointer-events: none;
}

.chat-session-panel__tool-status--success {
  border-color: color-mix(in srgb, var(--fabric-green-400) 34%, var(--fabric-border));
}

.chat-session-panel__tool-status--failed {
  border-color: color-mix(in srgb, var(--fabric-red-400, #ef4444) 38%, var(--fabric-border));
}

.chat-session-panel__tool-status-copy {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.chat-session-panel__tool-status-copy span {
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xs);
  font-weight: 700;
}

.chat-session-panel__tool-status-copy p {
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
  line-height: 1.35;
}

.chat-session-panel__tool-final-reply {
  width: min(420px, 100%);
  border-left: 1px solid color-mix(in srgb, var(--fabric-green-400) 34%, var(--fabric-border));
  margin-top: var(--fabric-space-2);
  padding-left: var(--fabric-space-3);
}

.chat-session-panel__tool-dots {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

.chat-session-panel__tool-dots span {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--fabric-amber-400);
  animation: chat-typing-bounce 0.9s ease-in-out infinite;
}

.chat-session-panel__tool-dots span:nth-child(2) {
  animation-delay: 0.12s;
}

.chat-session-panel__tool-dots span:nth-child(3) {
  animation-delay: 0.24s;
}

.chat-session-panel__typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 18px;
}

.chat-session-panel__typing-dots span {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--fabric-text-muted);
  animation: chat-typing-bounce 0.9s ease-in-out infinite;
}

.chat-session-panel__typing-dots span:nth-child(2) {
  animation-delay: 0.12s;
}

.chat-session-panel__typing-dots span:nth-child(3) {
  animation-delay: 0.24s;
}

.chat-session-panel__approval-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--fabric-space-2);
  margin-top: var(--fabric-space-1);
}

.chat-session-panel__approval-button {
  min-width: 72px;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-elevated);
  color: var(--fabric-text-secondary);
  cursor: pointer;
  font-size: var(--fabric-text-xs);
  font-weight: 700;
  line-height: 1;
  padding: 7px 10px;
}

.chat-session-panel__approval-button--primary {
  border-color: var(--fabric-border-strong);
  background: var(--fabric-bg-inverse);
  color: var(--fabric-text-inverse);
}

.chat-session-panel__approval-button:disabled {
  opacity: 0.55;
  cursor: wait;
}

.chat-session-panel__composer {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: var(--fabric-space-2);
}

.chat-session-panel__composer-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--fabric-space-2);
  padding: 7px;
  border: 1px solid var(--fabric-border);
  background: var(--fabric-bg-surface);
}

.chat-session-panel__composer-shell:focus-within {
  border-color: var(--fabric-border-strong);
}

.chat-session-panel__input {
  min-height: 65px;
  max-height: 112px;
  resize: none;
  border: 0;
  outline: none;
  padding: 5px 6px;
  background: transparent;
  color: var(--fabric-text-primary);
  font: inherit;
  font-size: var(--fabric-text-sm);
  line-height: 1.5;
}

.chat-session-panel__input::placeholder {
  color: var(--fabric-text-muted);
}

.chat-session-panel__input:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.chat-session-panel__composer-actions {
  justify-content: flex-end;
  gap: var(--fabric-space-1);
}

.chat-session-panel__icon-button,
.chat-session-panel__send {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-text-secondary);
  cursor: pointer;
  transition:
    background 120ms ease,
    opacity 120ms ease,
    border-color 120ms ease,
    color 120ms ease,
    transform 120ms ease;
}

.chat-session-panel__icon-button {
  position: relative;
  background: var(--fabric-bg-elevated);
}

.chat-session-panel__icon-button:hover:not(:disabled),
.chat-session-panel__send:hover:not(:disabled) {
  transform: translateY(-1px);
}

.chat-session-panel__icon-button--listening {
  border-color: var(--fabric-amber-400);
  color: var(--fabric-amber-400);
}

.chat-session-panel__icon-button--listening::after {
  position: absolute;
  inset: -5px;
  border: 1px solid rgba(245, 158, 11, 0.45);
  border-radius: var(--fabric-radius-sm);
  animation: chat-listening-pulse 1.2s ease-out infinite;
  content: '';
}

.chat-session-panel__send {
  border-color: var(--fabric-border-strong);
  background: var(--fabric-bg-inverse);
  color: var(--fabric-text-inverse);
}

.chat-session-panel__icon-button:disabled,
.chat-session-panel__send:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.chat-session-panel__spin {
  animation: chat-spin 0.8s linear infinite;
}

.chat-session-panel__error {
  color: var(--fabric-text-error);
}

.chat-message-enter-active,
.chat-message-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.chat-message-enter-from[data-role="assistant"] {
  opacity: 0;
  transform: translate(-10px, 10px);
}

.chat-message-enter-from[data-role="user"] {
  opacity: 0;
  transform: translate(10px, 10px);
}

.chat-message-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@keyframes chat-listening-pulse {
  from {
    opacity: 0.8;
    transform: scale(0.92);
  }

  to {
    opacity: 0;
    transform: scale(1.2);
  }
}

@keyframes chat-tool-shimmer {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(100%);
  }
}

@keyframes chat-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes chat-typing-bounce {
  0%,
  80%,
  100% {
    opacity: 0.45;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-4px);
  }
}
</style>
