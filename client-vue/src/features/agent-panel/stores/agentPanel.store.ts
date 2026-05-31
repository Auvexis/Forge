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
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load agents'
    } finally {
      loading.value = false
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
  }
})
