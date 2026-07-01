import { apiRequest } from './client.ts'
import { ENDPOINTS } from './endpoints.ts'
import type {
  AgentApprovalDecisionPayload,
  AgentChatMessage,
  SendAgentChatMessagePayload,
  SendAgentChatMessageResult,
} from '../../features/agent-runtime/types/agent.types.ts'

export const agentChatApi = {
  sendMessage: (chatSlug: string, payload: SendAgentChatMessagePayload) =>
    apiRequest<SendAgentChatMessageResult>(ENDPOINTS.AGENT_CHAT_MESSAGES(chatSlug), {
      method: 'POST',
      body: payload,
    }),

  listSessionMessages: (sessionId: string) =>
    apiRequest<AgentChatMessage[]>(ENDPOINTS.AGENT_CHAT_SESSION_MESSAGES(sessionId)),

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
