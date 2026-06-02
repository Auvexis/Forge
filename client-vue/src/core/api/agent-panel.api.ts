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
import type {
  AgentApprovalDecisionPayload,
  AgentChatMessage,
  AgentChatSession,
} from '@/features/agent-runtime/types/agent.types'

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
    streamAgentPanelEvents(sessionId, payload),

  approveToolCall: (approvalId: string, payload: AgentApprovalDecisionPayload) =>
    apiRequest(ENDPOINTS.AGENT_APPROVAL_APPROVE(approvalId), {
      method: 'POST',
      body: payload,
    }),

  rejectToolCall: (approvalId: string, payload: AgentApprovalDecisionPayload) =>
    apiRequest(ENDPOINTS.AGENT_APPROVAL_REJECT(approvalId), {
      method: 'POST',
      body: payload,
    }),

  deleteSession: (sessionId: string, payload: DeleteAgentPanelSessionPayload) =>
    apiRequest<null>(ENDPOINTS.AGENT_PANEL_SESSION(sessionId), {
      method: 'DELETE',
      params: { memoryMode: payload.memoryMode },
    }),
}

async function startMessageStream(
  sessionId: string,
  payload: SendAgentPanelMessagePayload,
): Promise<{ streamId: string }> {
  return apiRequest<{ streamId: string }>(ENDPOINTS.AGENT_PANEL_SESSION_MESSAGES_STREAM_START(sessionId), {
    method: 'POST',
    body: payload,
  })
}

async function* streamAgentPanelEvents(
  sessionId: string,
  payload: SendAgentPanelMessagePayload,
): AsyncGenerator<AgentPanelStreamEvent> {
  const { streamId } = await startMessageStream(sessionId, payload)
  const eventSource = new EventSource(`${API_BASE_URL}${ENDPOINTS.AGENT_PANEL_SESSION_MESSAGES_STREAM_EVENTS(sessionId, streamId)}`)
  const queue: AgentPanelStreamEvent[] = []
  let notify: (() => void) | null = null
  let closed = false

  eventSource.onmessage = (message) => {
    queue.push(JSON.parse(message.data) as AgentPanelStreamEvent)
    notify?.()
    notify = null
  }
  eventSource.onerror = () => {
    if (!closed) {
      queue.push({ type: 'error', message: 'Agent stream connection failed' })
    }
    closed = true
    notify?.()
    notify = null
    eventSource.close()
  }

  try {
    while (!closed || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          notify = resolve
        })
        continue
      }

      const event = queue.shift()!
      if (event.type === 'done' || event.type === 'error') {
        closed = true
        eventSource.close()
      }
      yield event
    }
  } finally {
    closed = true
    eventSource.close()
  }
}
