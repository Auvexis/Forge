import { apiRequest } from './client.ts'
import { ENDPOINTS } from './endpoints.ts'
import type {
  AgentPanelMessageResult,
  CreateAgentPanelSessionPayload,
  DeleteAgentPanelSessionPayload,
  PublishedAgentSummary,
  SendAgentPanelMessagePayload,
} from '@/features/agent-panel/types/agent-panel.types'
import type { AgentChatMessage, AgentChatSession } from '@/features/agent-runtime/types/agent.types'

export const agentPanelApi = {
  listAgents: (scope: 'current' | 'global' = 'current') =>
    apiRequest<PublishedAgentSummary[]>(ENDPOINTS.AGENT_PANEL_AGENTS, { params: { scope } }),

  listSessions: (agentKey: string) =>
    apiRequest<AgentChatSession[]>(ENDPOINTS.AGENT_PANEL_AGENT_SESSIONS(agentKey)),

  createSession: (agentKey: string, payload: CreateAgentPanelSessionPayload = {}) =>
    apiRequest<AgentChatSession>(ENDPOINTS.AGENT_PANEL_AGENT_SESSIONS(agentKey), {
      method: 'POST',
      body: payload,
    }),

  listMessages: (sessionId: string) =>
    apiRequest<AgentChatMessage[]>(ENDPOINTS.AGENT_PANEL_SESSION_MESSAGES(sessionId)),

  sendFirstMessage: (agentKey: string, payload: SendAgentPanelMessagePayload) =>
    apiRequest<AgentPanelMessageResult>(ENDPOINTS.AGENT_PANEL_AGENT_MESSAGES(agentKey), {
      method: 'POST',
      body: payload,
    }),

  sendMessage: (sessionId: string, payload: SendAgentPanelMessagePayload) =>
    apiRequest<AgentPanelMessageResult>(ENDPOINTS.AGENT_PANEL_SESSION_MESSAGES(sessionId), {
      method: 'POST',
      body: payload,
    }),

  deleteSession: (sessionId: string, payload: DeleteAgentPanelSessionPayload) =>
    apiRequest<null>(ENDPOINTS.AGENT_PANEL_SESSION(sessionId), {
      method: 'DELETE',
      params: { memoryMode: payload.memoryMode },
    }),
}
