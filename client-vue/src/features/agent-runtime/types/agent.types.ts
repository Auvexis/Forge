export type AgentMemoryScope = 'none' | 'session' | 'workflow' | 'profile' | 'user'

export type AgentToolSideEffect =
  | 'read'
  | 'write'
  | 'delete'
  | 'external-message'
  | 'external-payment'
  | 'filesystem'

export type AgentChatMessageRole = 'user' | 'assistant' | 'tool' | 'system'

export interface AgentChatSession {
  id: string
  profileId: string
  workflowId: string
  triggerNodeId: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface AgentChatMessage {
  id: string
  profileId: string
  sessionId: string
  role: AgentChatMessageRole
  content: unknown
  createdAt: string
}

export interface SendAgentChatMessagePayload {
  message: string
  sessionId?: string
  userId?: string
  metadata?: Record<string, unknown>
}

export interface SendAgentChatMessageResult {
  session: AgentChatSession
  messages: AgentChatMessage[]
  assistantResponse: unknown
  execution: unknown
}

export interface AgentToolDefinition {
  name: string
  description: string
  pluginId: string
  methodId: string
  inputSchema: Record<string, unknown>
  sideEffect: AgentToolSideEffect
  requiresApproval: boolean
  timeoutMs: number
}

export interface AgentMemoryRecord {
  id: string
  profileId: string
  namespace: string
  key: string
  value: unknown
  source: string
  createdAt: string
  updatedAt: string
}

export interface SaveAgentMemoryPayload {
  namespace?: string
  key: string
  value: unknown
  source?: string
}

export interface AgentApprovalDecisionPayload {
  executionId: string
  reason?: string
}
