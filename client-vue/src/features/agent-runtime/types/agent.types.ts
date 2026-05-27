export type AgentMemoryScope = 'none' | 'session' | 'workflow' | 'profile' | 'user'

export type AgentModelAdapter = 'openai-compatible'

export type AgentToolSideEffect =
  | 'read'
  | 'write'
  | 'delete'
  | 'external-message'
  | 'external-payment'
  | 'filesystem'

export type AgentChatMessageRole = 'user' | 'assistant' | 'tool' | 'system'

export interface AiAgentNodeConfig {
  type: 'ai-agent'
  name: string
  prompt: string
  maxIterations: number
  maxToolCalls: number
  timeoutMs: number
  requireApprovalForSideEffects: AgentToolSideEffect[]
  outputMode: 'text' | 'json'
  outputSchema?: Record<string, any>
}

export interface AiModelNodeConfig {
  type: 'ai-model'
  name: string
  pluginId: string
  adapter: AgentModelAdapter
  model: string
  temperature: number
  maxTokens?: number
  credentialId?: string
  baseUrl?: string
}

export interface AiMemoryNodeConfig {
  type: 'ai-memory'
  name: string
  scope: AgentMemoryScope
  readEnabled: boolean
  writeEnabled: boolean
  maxRetrievedMemories: number
  maxMemoryChars: number
}

export interface AiToolNodeConfig {
  type: 'ai-tool'
  name: string
  pluginId: string
  methodId: string
  descriptionOverride?: string
  timeoutMs: number
  requiresApproval: boolean
  sideEffect: AgentToolSideEffect
  inputDefaults?: Record<string, any>
}

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
