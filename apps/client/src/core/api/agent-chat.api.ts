import { apiRequest } from './client.ts'
import { ENDPOINTS } from './endpoints.ts'
import type {
  AgentApprovalDecisionPayload,
  AgentChatDirectoryEntry,
  AgentChatMessage,
  AgentChatSession,
  AgentSessionSnapshot,
  SendAgentChatMessagePayload,
  SendAgentChatMessageResult,
} from '../../features/agent-runtime/types/agent.types.ts'

export const agentChatApi = {
  listChats: () =>
    apiRequest<AgentChatDirectoryEntry[]>(ENDPOINTS.AGENT_CHATS),

  createSession: (chatSlug: string, title?: string) =>
    apiRequest<AgentChatSession>(ENDPOINTS.AGENT_CHAT_SESSIONS(chatSlug), {
      method: 'POST',
      body: title ? { title } : {},
    }),

  sendMessage: (chatSlug: string, payload: SendAgentChatMessagePayload) =>
    apiRequest<SendAgentChatMessageResult>(ENDPOINTS.AGENT_CHAT_MESSAGES(chatSlug), {
      method: 'POST',
      body: payload,
    }),

  listSessionMessages: (sessionId: string) =>
    apiRequest<AgentChatMessage[]>(ENDPOINTS.AGENT_CHAT_SESSION_MESSAGES(sessionId)),

  renameSession: (sessionId: string, title: string) =>
    apiRequest<AgentChatSession>(ENDPOINTS.AGENT_CHAT_SESSION(sessionId), {
      method: 'PATCH',
      body: { title },
    }),

  deleteSession: (sessionId: string) =>
    apiRequest<{ deleted: true }>(ENDPOINTS.AGENT_CHAT_SESSION(sessionId), {
      method: 'DELETE',
    }),

  getSessionSnapshot: (sessionId: string) =>
    apiRequest<AgentSessionSnapshot>(ENDPOINTS.AGENT_SESSION_SNAPSHOT(sessionId), {
      cache: 'no-store',
    }),

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
}
