import type { AgentChatMessage, AgentChatSession } from '@/features/agent-runtime/types/agent.types'

export interface PublishedAgentSummary {
  key: string
  profileId: string
  workflowId: string
  workflowName: string
  triggerNodeId: string
  agentNodeId: string
  chatSlug: string
  chatTitle: string
  name: string
  emoji: string
  modelNodeId: string
}

export interface CreateAgentPanelSessionPayload {
  title?: string
}

export interface SendAgentPanelMessagePayload {
  message: string
}

export interface DeleteAgentPanelSessionPayload {
  memoryMode: 'session' | 'transcript-only' | 'all-agent-memory'
}

export interface AgentPanelMessageResult {
  session: AgentChatSession
  messages: AgentChatMessage[]
  execution: unknown
}

export type AgentPanelStreamEvent =
  | { type: 'start' }
  | { type: 'thinking'; delta: string }
  | { type: 'delta'; delta: string }
  | { type: 'done'; result: AgentPanelMessageResult }
  | { type: 'error'; code?: string; message: string }
