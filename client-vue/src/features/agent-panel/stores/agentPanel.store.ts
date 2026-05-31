import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { agentPanelApi } from '@/core/api/agent-panel.api'
import type { AgentChatMessage, AgentChatSession } from '@/features/agent-runtime/types/agent.types'
import type { PublishedAgentSummary } from '@/features/agent-panel/types/agent-panel.types'

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

  async function loadAgents(scope: 'current' | 'global' = 'current') {
    loading.value = true
    error.value = ''
    directoryError.value = ''
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
    selectedAgentKey.value = agentKey
    selectedSessionId.value = ''
    draftSessionOpen.value = false
    messages.value = []
    await loadSessions(agentKey)
  }

  async function loadSessions(agentKey = selectedAgentKey.value) {
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
    selectedSessionId.value = sessionId
    draftSessionOpen.value = false
    await loadMessages(sessionId)
  }

  async function loadMessages(sessionId = selectedSessionId.value) {
    messages.value = sessionId ? await agentPanelApi.listMessages(sessionId) : []
  }

  function openDraftSession() {
    if (!selectedAgentKey.value) return
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

  async function sendMessage(message: string) {
    const text = message.trim()
    if (!text || sending.value || (!selectedAgentKey.value && !selectedSessionId.value)) return
    if (!selectedSessionId.value && !draftSessionOpen.value) return

    sending.value = true
    chatError.value = ''
    error.value = ''
    try {
      const result = selectedSessionId.value
        ? await agentPanelApi.sendMessage(selectedSessionId.value, { message: text })
        : await agentPanelApi.sendFirstMessage(selectedAgentKey.value, { message: text })
      draftSessionOpen.value = false
      selectedSessionId.value = result.session.id
      messages.value = result.messages
      sessions.value = [result.session, ...sessions.value.filter((session) => session.id !== result.session.id)]
    } catch (err) {
      chatError.value = err instanceof Error ? err.message : 'Agent message failed'
      error.value = chatError.value
    } finally {
      sending.value = false
    }
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
    sendMessage,
  }
})
