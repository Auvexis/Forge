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
      body: agentPanelMessageBody(payload),
    }),

  sendMessageStream: (
    sessionId: string,
    payload: SendAgentPanelMessagePayload,
    options: { signal?: AbortSignal } = {},
  ) => streamAgentPanelEvents(sessionId, payload, options),

  approveToolCallStream: (approvalId: string, payload: AgentApprovalDecisionPayload) =>
    streamApprovalContinuation(approvalId, payload),

  cancelExecution: (executionId: string) =>
    apiRequest<{ executionId: string }>(ENDPOINTS.CANCEL_EXECUTION(executionId), {
      method: 'POST',
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

  deleteSession: (sessionId: string, payload: DeleteAgentPanelSessionPayload) =>
    apiRequest<null>(ENDPOINTS.AGENT_PANEL_SESSION(sessionId), {
      method: 'DELETE',
      params: { memoryMode: payload.memoryMode },
    }),
}

async function startMessageStream(
  sessionId: string,
  payload: SendAgentPanelMessagePayload,
  options: { signal?: AbortSignal } = {},
): Promise<{ streamId: string }> {
  return apiRequest<{ streamId: string }>(ENDPOINTS.AGENT_PANEL_SESSION_MESSAGES_STREAM_START(sessionId), {
    method: 'POST',
    body: agentPanelMessageBody(payload),
    signal: options.signal,
  })
}

function agentPanelMessageBody(payload: SendAgentPanelMessagePayload) {
  return {
    message: payload.message,
    ...(payload.selectedValue !== undefined ? { selectedValue: payload.selectedValue } : {}),
    ...(payload.executionMode ? { executionMode: payload.executionMode } : {}),
  }
}

async function* streamAgentPanelEvents(
  sessionId: string,
  payload: SendAgentPanelMessagePayload,
  options: { signal?: AbortSignal } = {},
): AsyncGenerator<AgentPanelStreamEvent> {
  const { streamId } = await startMessageStream(sessionId, payload, options)
  const eventSource = new EventSource(`${API_BASE_URL}${ENDPOINTS.AGENT_PANEL_SESSION_MESSAGES_STREAM_EVENTS(sessionId, streamId)}`)
  const queue: AgentPanelStreamEvent[] = []
  let notify: (() => void) | null = null
  let closed = false
  const abortStream = () => {
    closed = true
    notify?.()
    notify = null
    eventSource.close()
  }

  eventSource.onmessage = (message) => {
    const event = JSON.parse(message.data) as AgentPanelStreamEvent
    if (event.type === 'start' && !event.executionId) return
    queue.push(event)
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
  options.signal?.addEventListener('abort', abortStream, { once: true })

  try {
    while (!closed || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          notify = resolve
        })
        continue
      }

      const event = queue.shift()!
      if (event.type === 'done' || event.type === 'waiting-approval' || event.type === 'error') {
        closed = true
        eventSource.close()
      }
      yield event
    }
  } finally {
    closed = true
    options.signal?.removeEventListener('abort', abortStream)
    eventSource.close()
  }
}

async function* streamApprovalContinuation(
  approvalId: string,
  payload: AgentApprovalDecisionPayload,
): AsyncGenerator<AgentPanelStreamEvent> {
  const executionId = String(payload.executionId ?? '').trim()
  if (!executionId) {
    yield { type: 'error', message: 'Agent approval execution was not found' }
    return
  }

  const eventSource = new EventSource(`${API_BASE_URL}${ENDPOINTS.STREAM_EXECUTION(executionId)}`)
  const completedTools: NonNullable<Extract<AgentPanelStreamEvent, { type: 'summary' }>['tools']> = []
  const queue: AgentPanelStreamEvent[] = []
  let notify: (() => void) | null = null
  let opened: (() => void) | null = null
  let closed = false

  eventSource.onopen = () => {
    opened?.()
    opened = null
  }
  eventSource.onmessage = (message) => {
    const workflowEvent = JSON.parse(message.data) as WorkflowStreamEvent
    for (const event of mapWorkflowEventToAgentPanelEvents(workflowEvent, completedTools)) {
      queue.push(event)
    }
    if (isTerminalWorkflowEvent(workflowEvent)) {
      if (workflowEvent.type === 'workflow:success' && completedTools.length > 0) {
        queue.push({
          type: 'summary',
          message: `Tools used: ${completedTools.map((tool) => tool.name).join(', ')}.`,
          tools: completedTools,
        })
      }
      queue.push({ type: 'approval-complete' })
      closed = true
      eventSource.close()
    }
    notify?.()
    notify = null
  }
  eventSource.onerror = () => {
    if (!closed) queue.push({ type: 'error', message: 'Agent approval stream connection failed' })
    closed = true
    opened?.()
    opened = null
    notify?.()
    notify = null
    eventSource.close()
  }

  try {
    await new Promise<void>((resolve) => {
      opened = resolve
    })
    if (!closed) {
      await apiRequest(ENDPOINTS.AGENT_APPROVAL_APPROVE(approvalId), {
        method: 'POST',
        body: payload,
      })
    }

    while (!closed || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          notify = resolve
        })
        continue
      }
      const event = queue.shift()!
      if (event.type === 'error' || event.type === 'approval-complete') {
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

interface WorkflowStreamEvent {
  type: string
  data?: Record<string, unknown>
}

function mapWorkflowEventToAgentPanelEvents(
  workflowEvent: WorkflowStreamEvent,
  completedTools: NonNullable<Extract<AgentPanelStreamEvent, { type: 'summary' }>['tools']>,
): AgentPanelStreamEvent[] {
  if (workflowEvent.type === 'agent:thinking') {
    const message = typeof workflowEvent.data?.message === 'string' ? workflowEvent.data.message.trim() : ''
    return message ? [{ type: 'progress', status: 'running', message }] : []
  }
  if (workflowEvent.type === 'agent:plan-end') {
    return [
      { type: 'progress', status: 'planned', message: 'Generating parameters' },
      { type: 'progress', status: 'running', message: 'Executing' },
    ]
  }
  if (workflowEvent.type === 'agent:repair-start') {
    const message = typeof workflowEvent.data?.message === 'string' ? workflowEvent.data.message.trim() : ''
    return message ? [{ type: 'progress', status: 'retrying', message }] : []
  }
  if (workflowEvent.type === 'agent:approval-created') {
    return [{
      type: 'approval',
      approvalId: typeof workflowEvent.data?.approvalId === 'string' ? workflowEvent.data.approvalId : '',
      executionId: typeof workflowEvent.data?.executionId === 'string' ? workflowEvent.data.executionId : '',
      toolName: typeof workflowEvent.data?.toolName === 'string' ? workflowEvent.data.toolName : 'agent tool',
      ...(typeof workflowEvent.data?.sideEffect === 'string' ? { sideEffect: workflowEvent.data.sideEffect } : {}),
      message: 'Aprovacao necessaria para continuar.',
    }]
  }
  if (workflowEvent.type === 'agent:output-delta' && typeof workflowEvent.data?.delta === 'string') {
    return [{ type: 'delta', delta: workflowEvent.data.delta }]
  }
  if (workflowEvent.type === 'agent:error') {
    const message = workflowEvent.data?.message ?? workflowEvent.data?.error
    return [{ type: 'error', message: typeof message === 'string' ? message : 'Agent execution failed' }]
  }

  const status = workflowToolStatus(workflowEvent.type, workflowEvent.data)
  if (!status) return []

  const tool = workflowTool(workflowEvent.data)
  if (status === 'success' || status === 'failed') completedTools.push(tool)
  return [{
    type: 'progress',
    status,
    message: workflowToolMessage(tool.name, status),
    tool,
  }]
}

function workflowToolStatus(
  type: string,
  data: Record<string, unknown> | undefined,
): Extract<AgentPanelStreamEvent, { type: 'progress' }>['status'] | null {
  if (type === 'agent:tool-intent') return 'planned'
  if (type === 'agent:tool-start') return 'running'
  if (type === 'agent:tool-retry') return 'retrying'
  if (type === 'agent:tool-end') return data?.status === 'failed' ? 'failed' : 'success'
  return null
}

function workflowTool(data: Record<string, unknown> | undefined) {
  const name = typeof data?.name === 'string' && data.name.trim() ? data.name.trim() : 'agent tool'
  const callId = typeof data?.callId === 'string' ? data.callId : name
  return {
    toolCallId: callId,
    name,
    ...(typeof data?.pluginId === 'string' ? { pluginId: data.pluginId } : {}),
    ...(typeof data?.pluginName === 'string' ? { pluginName: data.pluginName } : {}),
    ...(typeof data?.reason === 'string' ? { reason: data.reason } : {}),
  }
}

function workflowToolMessage(
  name: string,
  status: Extract<AgentPanelStreamEvent, { type: 'progress' }>['status'],
): string {
  if (status === 'planned') return `Preparing to use ${name}.`
  if (status === 'running') return `Using ${name}.`
  if (status === 'retrying') return `Retrying ${name}.`
  if (status === 'success') return `${name} completed.`
  return `${name} failed.`
}

function isTerminalWorkflowEvent(event: WorkflowStreamEvent): boolean {
  return event.type === 'workflow:success' ||
    event.type === 'workflow:failed' ||
    event.type === 'workflow:cancelled' ||
    event.type === 'workflow:waiting-approval'
}
