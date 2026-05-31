import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { agentPanelApi } from '@/core/api/agent-panel.api'
import { useToast } from '@/shared/composables/useToast'
import type { AgentChatMessage, AgentChatSession } from '@/features/agent-runtime/types/agent.types'
import type {
  AgentPanelProgressContent,
  AgentPanelSummaryContent,
  AgentPanelStreamEvent,
  PublishedAgentSummary,
} from '@/features/agent-panel/types/agent-panel.types'

export const useAgentPanelStore = defineStore('agent-panel', () => {
  const agents = ref<PublishedAgentSummary[]>([])
  const sessions = ref<AgentChatSession[]>([])
  const messages = ref<AgentChatMessage[]>([])
  const selectedAgentKey = ref('')
  const selectedSessionId = ref('')
  const draftSessionOpen = ref(false)
  const loading = ref(false)
  const sending = ref(false)
  const error = ref('')
  const directoryError = ref('')
  const chatError = ref('')

  const selectedAgent = computed(
    () => agents.value.find((agent) => agent.key === selectedAgentKey.value) ?? null,
  )
  const selectedSession = computed(
    () => sessions.value.find((session) => session.id === selectedSessionId.value) ?? null,
  )
  const hasOpenChat = computed(() => Boolean(selectedAgent.value && (draftSessionOpen.value || selectedSession.value)))

  function clearChatError() {
    chatError.value = ''
    if (error.value && error.value !== directoryError.value) error.value = ''
  }

  async function loadAgents(scope: 'current' | 'global' = 'current') {
    loading.value = true
    error.value = ''
    directoryError.value = ''
    clearChatError()
    try {
      agents.value = await agentPanelApi.listAgents(scope)
      selectedAgentKey.value = selectedAgentKey.value || agents.value[0]?.key || ''
    } catch (err) {
      directoryError.value = err instanceof Error ? err.message : 'Failed to load agents'
      error.value = directoryError.value
    } finally {
      loading.value = false
    }
    if (!directoryError.value && selectedAgentKey.value) await loadSessions(selectedAgentKey.value)
  }

  async function selectAgent(agentKey: string) {
    clearChatError()
    selectedAgentKey.value = agentKey
    selectedSessionId.value = ''
    draftSessionOpen.value = false
    messages.value = []
    await loadSessions(agentKey)
  }

  async function loadSessions(agentKey = selectedAgentKey.value) {
    clearChatError()
    if (!agentKey) {
      sessions.value = []
      selectedSessionId.value = ''
      draftSessionOpen.value = false
      messages.value = []
      return
    }
    try {
      chatError.value = ''
      sessions.value = await agentPanelApi.listSessions(agentKey)
      selectedSessionId.value = sessions.value[0]?.id ?? ''
      draftSessionOpen.value = !selectedSessionId.value
      messages.value = []
      if (selectedSessionId.value) await loadMessages(selectedSessionId.value)
    } catch (err) {
      chatError.value = err instanceof Error ? err.message : 'Failed to load chats'
      error.value = chatError.value
    }
  }

  async function selectSession(sessionId: string) {
    clearChatError()
    selectedSessionId.value = sessionId
    draftSessionOpen.value = false
    await loadMessages(sessionId)
  }

  async function loadMessages(sessionId = selectedSessionId.value) {
    messages.value = sessionId ? await agentPanelApi.listMessages(sessionId) : []
  }

  function openDraftSession() {
    if (!selectedAgentKey.value) return
    clearChatError()
    selectedSessionId.value = ''
    draftSessionOpen.value = true
    messages.value = []
  }

  const createSession = openDraftSession

  async function deleteSession(
    sessionId: string,
    memoryMode: 'session' | 'transcript-only' | 'all-agent-memory' = 'session',
  ) {
    await agentPanelApi.deleteSession(sessionId, { memoryMode })
    sessions.value = sessions.value.filter((session) => session.id !== sessionId)
    if (selectedSessionId.value !== sessionId) return

    selectedSessionId.value = sessions.value[0]?.id ?? ''
    draftSessionOpen.value = !selectedSessionId.value
    messages.value = []
    if (selectedSessionId.value) await loadMessages(selectedSessionId.value)
  }

  function appendOptimisticUserMessage(sessionId: string, text: string) {
    messages.value = [
      ...messages.value,
      {
        id: `local-user-${Date.now()}`,
        profileId: '',
        sessionId,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
        entrance: 'user',
      } as AgentChatMessage,
    ]
  }

  function appendPendingAssistantMessage(sessionId: string) {
    upsertStreamingAssistantMessage(sessionId, { pending: true })
  }

  function appendStreamingAssistantMessage(sessionId: string, delta = '') {
    if (!delta) return
    upsertStreamingAssistantMessage(sessionId, { textDelta: delta, pending: false })
  }

  function appendStreamingAssistantThinking(sessionId: string, delta = '') {
    if (!delta) return
    upsertStreamingAssistantMessage(sessionId, { thinkingDelta: delta, pending: false })
  }

  function appendAgentProgressMessage(
    sessionId: string,
    event: Extract<AgentPanelStreamEvent, { type: 'progress' }>,
  ) {
    const toolKey = event.tool?.toolCallId ?? `${event.tool?.name ?? 'agent-tool'}-${Date.now()}`
    const id = `local-agent-progress-${sessionId}-${toolKey}-${event.status}`
    const content: AgentPanelProgressContent = {
      kind: 'agentProgress',
      status: event.status,
      message: event.message,
      tool: event.tool,
    }
    const existing = messages.value.find((message) => message.id === id)
    if (existing) {
      existing.content = content
      return
    }

    messages.value = [
      ...messages.value,
      {
        id,
        profileId: '',
        sessionId,
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
        entrance: 'assistant',
      } as AgentChatMessage,
    ]
  }

  function appendAgentSummaryMessage(
    sessionId: string,
    event: Extract<AgentPanelStreamEvent, { type: 'summary' }>,
  ) {
    const id = `local-agent-summary-${sessionId}`
    const content: AgentPanelSummaryContent = {
      kind: 'agentSummary',
      message: event.message,
      tools: event.tools,
    }
    messages.value = [
      ...messages.value.filter((message) =>
        message.id !== id,
      ),
      {
        id,
        profileId: '',
        sessionId,
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
        entrance: 'assistant',
      } as AgentChatMessage,
    ]
  }

  function upsertStreamingAssistantMessage(
    sessionId: string,
    patch: { textDelta?: string; thinkingDelta?: string; pending?: boolean },
  ) {
    const existing = messages.value.find((message) => message.id === `local-assistant-stream-${sessionId}`)
    if (existing) {
      existing.content = mergeAssistantContent(existing.content, patch)
      return
    }

    messages.value = [
      ...messages.value,
      {
        id: `local-assistant-stream-${sessionId}`,
        profileId: '',
        sessionId,
        role: 'assistant',
        content: mergeAssistantContent(null, patch),
        createdAt: new Date().toISOString(),
        entrance: 'assistant',
      } as AgentChatMessage,
    ]
  }

  function remapLocalSessionMessages(fromSessionId: string, toSessionId: string) {
    messages.value = messages.value.map((message) => (
      message.sessionId === fromSessionId
        ? { ...message, sessionId: toSessionId, id: message.id.replace(fromSessionId, toSessionId) }
        : message
    ))
  }

  async function sendMessage(message: string) {
    const text = message.trim()
    if (!text || sending.value || (!selectedAgentKey.value && !selectedSessionId.value)) return
    if (!selectedSessionId.value && !draftSessionOpen.value) return

    const { error: toastError } = useToast()
    const localSessionId = selectedSessionId.value || `draft-${Date.now()}`
    appendOptimisticUserMessage(localSessionId, text)
    sending.value = true
    chatError.value = ''
    error.value = ''
    try {
      if (!selectedSessionId.value) {
        const session = await agentPanelApi.createSession(selectedAgentKey.value, {
          title: createSessionTitle(text),
        })
        draftSessionOpen.value = false
        selectedSessionId.value = session.id
        sessions.value = [session, ...sessions.value.filter((candidate) => candidate.id !== session.id)]
        remapLocalSessionMessages(localSessionId, session.id)
      }

      appendPendingAssistantMessage(selectedSessionId.value)
      let result = null as Awaited<ReturnType<typeof agentPanelApi.sendMessage>> | null
      for await (const event of agentPanelApi.sendMessageStream(selectedSessionId.value, { message: text })) {
        if (event.type === 'start') appendPendingAssistantMessage(selectedSessionId.value)
        if (event.type === 'thinking') appendStreamingAssistantThinking(selectedSessionId.value, event.delta)
        if (event.type === 'delta') appendStreamingAssistantMessage(selectedSessionId.value, event.delta)
        if (event.type === 'progress') appendAgentProgressMessage(selectedSessionId.value, event)
        if (event.type === 'summary') appendAgentSummaryMessage(selectedSessionId.value, event)
        if (event.type === 'error') throw new Error(event.message)
        if (event.type === 'done') result = event.result
      }
      if (!result) throw new Error('Agent message failed')
      draftSessionOpen.value = false
      selectedSessionId.value = result.session.id
      messages.value = mergeServerMessagesWithStableLocalTurn(result.messages, result.session.id)
      sessions.value = [result.session, ...sessions.value.filter((session) => session.id !== result.session.id)]
    } catch (err) {
      chatError.value = err instanceof Error ? err.message : 'Agent message failed'
      error.value = chatError.value
      toastError(chatError.value, 'Agent execution failed')
    } finally {
      sending.value = false
    }
  }

  function normalizeMessageText(content: unknown): string {
    if (typeof content === 'string') return content
    if (!content || typeof content !== 'object' || Array.isArray(content)) return ''
    const record = content as Record<string, unknown>
    if (typeof record.text === 'string') return record.text
    if (typeof record.content === 'string') return record.content
    return ''
  }

  function normalizeAssistantContent(content: unknown): { text: string; thinking: string; pending: boolean } {
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return { text: typeof content === 'string' ? content : '', thinking: '', pending: false }
    }
    const record = content as Record<string, unknown>
    return {
      text: typeof record.text === 'string' ? record.text : '',
      thinking: typeof record.thinking === 'string' ? record.thinking : '',
      pending: record.pending === true,
    }
  }

  function mergeAssistantContent(
    content: unknown,
    patch: { textDelta?: string; thinkingDelta?: string; pending?: boolean },
  ) {
    const current = normalizeAssistantContent(content)
    return {
      text: `${current.text}${patch.textDelta ?? ''}`,
      thinking: `${current.thinking}${patch.thinkingDelta ?? ''}`,
      pending: patch.pending ?? current.pending,
    }
  }

  function mergeServerMessagesWithStableLocalTurn(serverMessages: AgentChatMessage[], sessionId: string) {
    const localTurnStart = findLastMessageIndex(messages.value, (message) =>
      message.sessionId === sessionId && message.id.startsWith('local-user-'),
    )
    if (localTurnStart < 0) return serverMessages

    const stableLocalTurn = messages.value
      .slice(localTurnStart)
      .filter((message) => message.sessionId === sessionId)
      .map(finalizeLocalAssistantMessage)
    const previousLocalMessages = messages.value.slice(0, localTurnStart)
    return [...previousLocalMessages, ...stableLocalTurn]
  }

  function finalizeLocalAssistantMessage(message: AgentChatMessage): AgentChatMessage {
    if (!message.id.startsWith('local-assistant-stream-')) return message
    const content = normalizeAssistantContent(message.content)
    return {
      ...message,
      content: {
        text: content.text,
        thinking: content.thinking,
        pending: false,
      },
    }
  }

  function findLastMessageIndex(
    items: AgentChatMessage[],
    predicate: (message: AgentChatMessage) => boolean,
  ): number {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const message = items[index]
      if (message && predicate(message)) return index
    }
    return -1
  }

  function isAgentProgressContent(content: unknown): content is AgentPanelProgressContent {
    return Boolean(
      content &&
        typeof content === 'object' &&
        !Array.isArray(content) &&
        (content as { kind?: unknown }).kind === 'agentProgress',
    )
  }

  function isAgentSummaryContent(content: unknown): content is AgentPanelSummaryContent {
    return Boolean(
      content &&
        typeof content === 'object' &&
        !Array.isArray(content) &&
        (content as { kind?: unknown }).kind === 'agentSummary',
    )
  }

  function createSessionTitle(message: string): string {
    const title = message.replace(/\s+/g, ' ').trim()
    return title.length > 48 ? `${title.slice(0, 45)}...` : title || 'New chat'
  }

  return {
    agents,
    sessions,
    messages,
    selectedAgentKey,
    selectedSessionId,
    draftSessionOpen,
    loading,
    sending,
    error,
    directoryError,
    chatError,
    selectedAgent,
    selectedSession,
    hasOpenChat,
    loadAgents,
    selectAgent,
    loadSessions,
    selectSession,
    loadMessages,
    openDraftSession,
    createSession,
    deleteSession,
    appendPendingAssistantMessage,
    appendOptimisticUserMessage,
    appendStreamingAssistantMessage,
    appendStreamingAssistantThinking,
    appendAgentProgressMessage,
    appendAgentSummaryMessage,
    sendMessage,
  }
})
