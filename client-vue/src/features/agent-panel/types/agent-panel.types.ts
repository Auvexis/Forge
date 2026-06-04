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
  executionMode: 'loop' | 'plan'
}

export interface CreateAgentPanelSessionPayload {
  title?: string
}

export interface SendAgentPanelMessagePayload {
  message: string
  selectedValue?: unknown
  executionMode?: 'loop' | 'plan'
}

export interface DeleteAgentPanelSessionPayload {
  memoryMode: 'session' | 'transcript-only' | 'all-agent-memory'
}

export interface AgentPanelMessageResult {
  session: AgentChatSession
  messages: AgentChatMessage[]
  execution: unknown
}

export type AgentPanelProgressStatus = 'planned' | 'running' | 'retrying' | 'success' | 'failed'

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

export interface AgentPanelApprovalContent {
  kind: 'agentApproval'
  approvalId: string
  executionId: string
  toolName: string
  sideEffect?: string
  message: string
  decision?: 'approved' | 'rejected'
}

export interface AgentPanelChoiceOption {
  label: string
  value: unknown
  item?: unknown
}

export interface AgentPanelChoiceContent {
  kind: 'agentChoice'
  status: 'waiting-user'
  reason: 'ambiguous_result'
  question: string
  repeatedTool: string
  options: AgentPanelChoiceOption[]
  selectedValue?: unknown
}

export interface AgentPanelErrorContent {
  kind: 'agentError'
  message: string
}

export type AgentPanelStreamEvent =
  | { type: 'start'; executionId: string }
  | { type: 'delta'; delta: string }
  | {
      type: 'progress'
      status: AgentPanelProgressStatus
      message: string
      tool?: AgentPanelProgressContent['tool']
    }
  | { type: 'summary'; message: string; tools: AgentPanelSummaryTool[] }
  | {
      type: 'approval'
      approvalId: string
      executionId: string
      toolName: string
      sideEffect?: string
      message: string
    }
  | Omit<AgentPanelChoiceContent, 'kind'> & { type: 'choice' }
  | { type: 'done'; result: AgentPanelMessageResult }
  | { type: 'waiting-approval'; result: AgentPanelMessageResult }
  | { type: 'approval-complete' }
  | { type: 'error'; code?: string; message: string }
