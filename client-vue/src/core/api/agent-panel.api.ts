import { apiRequest } from './client.ts'
import { ENDPOINTS } from './endpoints.ts'
import { API_BASE_URL } from '@/core/constants/app'
import type {
  AgentPanelMessageResult,
  AgentPanelStreamEvent,
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

  sendMessageStream: (sessionId: string, payload: SendAgentPanelMessagePayload) =>
    streamAgentPanelEvents(ENDPOINTS.AGENT_PANEL_SESSION_MESSAGES_STREAM(sessionId), payload),

  deleteSession: (sessionId: string, payload: DeleteAgentPanelSessionPayload) =>
    apiRequest<null>(ENDPOINTS.AGENT_PANEL_SESSION(sessionId), {
      method: 'DELETE',
      params: { memoryMode: payload.memoryMode },
    }),
}

async function* streamAgentPanelEvents(
  path: string,
  payload: SendAgentPanelMessagePayload,
): AsyncGenerator<AgentPanelStreamEvent> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok || !response.body) {
    throw new Error(`Agent message failed (${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''

    for (const chunk of chunks) {
      const event = parseStreamEvent(chunk)
      if (event) yield event
    }
  }

  const event = parseStreamEvent(buffer)
  if (event) yield event
}

function parseStreamEvent(chunk: string): AgentPanelStreamEvent | null {
  const data = chunk
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('')
  if (!data) return null
  return JSON.parse(data) as AgentPanelStreamEvent
}
