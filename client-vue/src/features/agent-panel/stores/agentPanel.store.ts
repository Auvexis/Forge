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
  const loading = ref(false)
  const sending = ref(false)
  const error = ref('')

  const selectedAgent = computed(
    () => agents.value.find((agent) => agent.key === selectedAgentKey.value) ?? null,
  )
  const selectedSession = computed(
    () => sessions.value.find((session) => session.id === selectedSessionId.value) ?? null,
  )

  async function loadAgents(scope: 'current' | 'global' = 'current') {
    loading.value = true
    error.value = ''
    try {
      agents.value = await agentPanelApi.listAgents(scope)
      selectedAgentKey.value = selectedAgentKey.value || agents.value[0]?.key || ''
      if (selectedAgentKey.value) await loadSessions(selectedAgentKey.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load agents'
    } finally {
      loading.value = false
    }
  }

  async function selectAgent(agentKey: string) {
    selectedAgentKey.value = agentKey
    selectedSessionId.value = ''
    messages.value = []
    await loadSessions(agentKey)
  }

  async function loadSessions(agentKey = selectedAgentKey.value) {
    if (!agentKey) {
      sessions.value = []
      selectedSessionId.value = ''
      messages.value = []
      return
    }
    sessions.value = await agentPanelApi.listSessions(agentKey)
    selectedSessionId.value = sessions.value[0]?.id ?? ''
    if (selectedSessionId.value) await loadMessages(selectedSessionId.value)
  }

  async function selectSession(sessionId: string) {
    selectedSessionId.value = sessionId
    await loadMessages(sessionId)
  }

  async function loadMessages(sessionId = selectedSessionId.value) {
    messages.value = sessionId ? await agentPanelApi.listMessages(sessionId) : []
  }

  async function createSession(title = 'New chat') {
    if (!selectedAgentKey.value) return
    const session = await agentPanelApi.createSession(selectedAgentKey.value, { title })
    sessions.value = [session, ...sessions.value]
    selectedSessionId.value = session.id
    messages.value = []
  }

  async function deleteSession(
    sessionId: string,
    memoryMode: 'session' | 'transcript-only' | 'all-agent-memory' = 'session',
  ) {
    await agentPanelApi.deleteSession(sessionId, { memoryMode })
    sessions.value = sessions.value.filter((session) => session.id !== sessionId)
    if (selectedSessionId.value !== sessionId) return

    selectedSessionId.value = sessions.value[0]?.id ?? ''
    messages.value = []
    if (selectedSessionId.value) await loadMessages(selectedSessionId.value)
  }

  async function sendMessage(message: string) {
    const text = message.trim()
    if (!text || !selectedSessionId.value || sending.value) return

    sending.value = true
    error.value = ''
    try {
      const result = await agentPanelApi.sendMessage(selectedSessionId.value, { message: text })
      messages.value = result.messages
      const sessionIndex = sessions.value.findIndex((session) => session.id === result.session.id)
      if (sessionIndex >= 0) {
        sessions.value = sessions.value.map((session, index) =>
          index === sessionIndex ? result.session : session,
        )
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Agent message failed'
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
    loading,
    sending,
    error,
    selectedAgent,
    selectedSession,
    loadAgents,
    selectAgent,
    loadSessions,
    selectSession,
    loadMessages,
    createSession,
    deleteSession,
    sendMessage,
  }
})
