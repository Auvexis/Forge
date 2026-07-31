export type AgentMemoryScope = 'none' | 'session' | 'workflow' | 'profile' | 'user'
export type AgentMemoryAdapter = 'fabric-internal' | 'plugin-memory-store'

export type AgentModelAdapter = 'openai-compatible' | 'generic' | 'ollama'
export type AgentExecutionMode = 'loop'

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
  executionMode: AgentExecutionMode
  maxToolCalls: number
  /** Retry budget for transient/rate-limit tool failures only. */
  maxRetriesPerTool: number
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
  thinkingEnabled?: boolean
  thinkingRequest?: Record<string, any>
  thinkingSupported?: boolean
}

export interface AiMemoryNodeConfig {
  type: 'ai-memory'
  name: string
  scope: AgentMemoryScope
  readEnabled: boolean
  writeEnabled: boolean
  maxRetrievedMemories: number
  maxMemoryChars: number
  adapter?: AgentMemoryAdapter
  pluginId?: string
  searchMethodId?: string
  putMethodId?: string
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

export interface AgentChatDirectoryEntry {
  chatSlug: string
  title: string
  workflowId: string
  workflowName: string
  triggerNodeId: string
  sessions: AgentChatSession[]
}

export interface AgentChatMessage {
  id: string
  profileId: string
  sessionId: string
  role: AgentChatMessageRole
  content: unknown
  createdAt: string
}

export type AgentTurnState =
  | 'queued'
  | 'running'
  | 'waiting-user'
  | 'waiting-approval'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface AgentSessionTurn {
  id: string
  sessionId: string
  runId?: string
  state: AgentTurnState
  sequence: number
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface AgentSessionMessage {
  id: string
  sessionId: string
  turnId: string
  role: Exclude<AgentChatMessageRole, 'tool'>
  sequence: number
  createdAt: string
  completedAt?: string
}

interface AgentPartBase {
  id: string
  sessionId: string
  turnId: string
  messageId: string
  sequence: number
  createdAt: string
  updatedAt: string
}

export type AgentSessionPart =
  | (AgentPartBase & { type: 'text'; text: string; state: 'streaming' | 'completed' })
  | (AgentPartBase & {
      type: 'tool'
      callId: string
      actionId?: string
      toolName: string
      state: {
        status: 'pending' | 'running' | 'waiting-approval' | 'completed' | 'error'
        input?: unknown
        output?: unknown
        error?: unknown
        attempt?: number
        startedAt?: string
        requestedAt?: string
        completedAt?: string
      }
    })
  | (AgentPartBase & { type: 'artifact'; artifactRef: string; name: string; mimeType?: string; size: number })
  | (AgentPartBase & {
      type: 'interaction'
      interactionId: string
      kind: 'clarification' | 'selection' | 'approval' | 'authentication' | 'permission'
      question: string
      state: 'pending' | 'resolved' | 'cancelled'
      response?: unknown
    })
  | (AgentPartBase & { type: 'error'; error: unknown })
  | (AgentPartBase & {
      type: 'commitment'
      request: string
      items: Array<{
        id: string
        description: string
        status: 'pending' | 'completed' | 'failed'
        evidencePartIds: string[]
      }>
    })
  | (AgentPartBase & {
      type: 'compaction'
      summary: string
      firstMessageSequence: number
      lastMessageSequence: number
    })

export interface AgentSessionSnapshot {
  session: Omit<AgentChatSession, 'status'> & { state: 'active' | 'archived'; revision: number }
  activeTurn: AgentSessionTurn | null
  messages: Array<{ message: AgentSessionMessage; parts: AgentSessionPart[] }>
  pendingInteraction: Extract<AgentSessionPart, { type: 'interaction' }> | null
  revision: number
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
