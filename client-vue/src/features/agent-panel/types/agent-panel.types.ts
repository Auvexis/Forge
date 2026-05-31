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

export type AgentPanelProgressStatus = 'planned' | 'running' | 'success' | 'failed'

export interface AgentPanelProgressContent {
  kind: 'agentProgress'
  status: AgentPanelProgressStatus
  message: string
  tool?: {
    toolCallId: string
    name: string
    pluginId?: string
    pluginName?: string
    reason?: string
  }
}

export interface AgentPanelSummaryTool {
  toolCallId: string
  name: string
  pluginId?: string
  pluginName?: string
}

export interface AgentPanelSummaryContent {
  kind: 'agentSummary'
  message: string
  tools: AgentPanelSummaryTool[]
}

export type AgentPanelStreamEvent =
  | { type: 'start' }
  | { type: 'thinking'; delta: string }
  | { type: 'delta'; delta: string }
  | {
      type: 'progress'
      status: AgentPanelProgressStatus
      message: string
      tool?: AgentPanelProgressContent['tool']
    }
  | { type: 'summary'; message: string; tools: AgentPanelSummaryTool[] }
  | { type: 'done'; result: AgentPanelMessageResult }
  | { type: 'error'; code?: string; message: string }
