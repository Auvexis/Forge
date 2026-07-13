import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { workflowsApi } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'
import type {
  DevWorkflowSessionStatus,
  ExecutionTimelineEvent,
  NodeExecutionState,
  WorkflowExecutionStatus,
} from '@/core/types/execution.types'
import type { WorkflowEvent } from '@/core/types/execution.types'
import type { AgentChatMessage, AgentChatMessageRole } from '@/features/agent-runtime/types/agent.types'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'

export const useExecutionStore = defineStore('execution', () => {
  // ── State ────────────────────────────────────────────────────────────────

  /**
   * Per-node execution state keyed by nodeId.
   * Using reactive() (not ref()) so that individual key assignments like
   * `nodeStatuses[id] = newState` are tracked at the property level by Vue.
   * This lets computed() calls in node components react to changes for their
   * specific nodeId without the entire record being replaced.
   */
  const nodeStatuses = reactive<Record<string, NodeExecutionState>>({})

  /** True while an EventSource is open and receiving events */
  const isStreaming = ref(false)

  /** True while the POST /execute request is in-flight */
  const isExecuting = ref(false)

  /** The execution ID currently being streamed */
  const activeExecutionId = ref<string | null>(null)
  const activeSessionId = ref<string | null>(null)
  const sessionStatus = ref<DevWorkflowSessionStatus | null>(null)
  const activeJobs = reactive<Record<string, WorkflowEvent>>({})
  const triggerStatuses = reactive<Record<string, 'waiting' | 'received' | 'running' | 'success' | 'failed'>>({})
  const nodeStatusesByExecution = reactive<Record<string, Record<string, NodeExecutionState>>>({})
  const editorChatMessagesBySession = reactive<Record<string, AgentChatMessage[]>>({})
  const editorChatSessionIdByExecution = reactive<Record<string, string>>({})
  const agentFailuresByExecution = new Set<string>()
  const lastSuccessfulToolByExecution = new Map<string, EditorChatToolStatus>()
  const approvedToolExecutions = new Set<string>()
  /** Tracks which trigger node IDs are of type 'manual' — used to decide reset target after job ends */

  /** Last known overall workflow execution outcome */
  const workflowStatus = ref<WorkflowExecutionStatus | null>(null)
  const timeline = ref<ExecutionTimelineEvent[]>([])

  // Internal EventSource — intentionally non-reactive (DOM object)
  let _es: EventSource | null = null

  // ── Derived ──────────────────────────────────────────────────────────────

  const hasActiveExecution = computed(() => isStreaming.value || isExecuting.value || sessionStatus.value === 'running')

  // ── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Merges `patch` into the state for `nodeId`.
   * In-place mutation on the reactive record triggers per-key tracking.
   */
  function _patchNode(nodeId: string, patch: Partial<NodeExecutionState>) {
    const prev = nodeStatuses[nodeId]
    nodeStatuses[nodeId] = prev ? { ...prev, ...patch } : { status: 'idle' as const, ...patch }
  }

  function _patchExecutionNode(executionId: string | undefined, nodeId: string, patch: Partial<NodeExecutionState>) {
    if (!executionId) return
    const executionStatuses = nodeStatusesByExecution[executionId] ?? {}
    const prev = executionStatuses[nodeId]
    nodeStatusesByExecution[executionId] = {
      ...executionStatuses,
      [nodeId]: prev ? { ...prev, ...patch } : { status: 'idle' as const, ...patch },
    }
  }

  function clearTransientNodeStatuses() {
    for (const [nodeId, state] of Object.entries(nodeStatuses)) {
      if (state?.status === 'waiting' || state?.status === 'running' || state?.status === 'retrying') {
        nodeStatuses[nodeId] = { ...state, status: 'idle' }
      }
    }

    for (const key of Object.keys(triggerStatuses)) delete triggerStatuses[key]
    for (const key of Object.keys(activeJobs)) delete activeJobs[key]
  }

  type EditorChatToolStatus = {
    kind: 'toolStatus'
    executionId: string
    callId?: string
    toolName: string
    pluginName?: string
    status: 'pending' | 'running' | 'retrying' | 'success' | 'failed'
    requiresApproval?: boolean
    error?: string
  }

  function timelineStatusFor(type: string): ExecutionTimelineEvent['status'] {
    if (type === 'node:success' || type === 'workflow:success' || type === 'trigger:data' || type === 'job:success' || type === 'agent:end' || type === 'agent:model-end' || type === 'agent:tool-end') return 'success'
    if (type === 'node:failed' || type === 'workflow:failed' || type === 'job:failed' || type === 'agent:error') return 'failed'
    if (type === 'node:retry' || type === 'agent:tool-retry') return 'retrying'
    if (type === 'workflow:cancelled' || type === 'job:cancelled') return 'cancelled'
    if (type === 'node:start' || type === 'workflow:start' || type === 'temporary-form:created' || type === 'job:start' || type === 'agent:start' || type === 'agent:model-start' || type === 'agent:output-delta' || type === 'agent:thinking-delta' || type === 'agent:tool-intent' || type === 'agent:tool-start') {
      return 'running'
    }
    return 'info'
  }

  function timelineLabelFor(ev: WorkflowEvent): string {
    if (ev.type === 'node:start') {
      const attempt = ev.nodeId ? nodeStatuses[ev.nodeId]?.attempts : undefined
      return attempt && attempt > 1 ? `${ev.nodeId} attempt ${attempt} started` : `${ev.nodeId} started`
    }
    if (ev.type === 'node:retry') {
      const data = ev.data as { attempt?: number; delayMs?: number } | undefined
      const seconds = ((data?.delayMs ?? 0) / 1000).toFixed(1).replace(/\.0$/, '')
      return `${ev.nodeId} waiting ${seconds}s before attempt ${data?.attempt ?? 'next'}`
    }
    if (ev.type === 'node:success') return `${ev.nodeId} succeeded`
    if (ev.type === 'node:failed') return `${ev.nodeId} failed`
    if (ev.type === 'job:queued') return `${ev.source ?? 'manual'} job queued`
    if (ev.type === 'job:start') return `${ev.source ?? 'manual'} job started`
    if (ev.type === 'job:success') return `${ev.source ?? 'manual'} job succeeded`
    if (ev.type === 'job:failed') return `${ev.source ?? 'manual'} job failed`
    if (ev.type === 'session:start') return 'Dev session started'
    if (ev.type === 'session:ready') return 'Dev session ready'
    if (ev.type === 'session:stopping') return 'Dev session stopping'
    if (ev.type === 'session:stopped') return 'Dev session stopped'
    if (ev.type === 'trigger:data') return 'Trigger payload received'
    if (ev.type === 'temporary-form:created') return `${ev.nodeId} waiting for form`
    if (ev.type === 'agent:start') return 'Agent started'
    if (ev.type === 'agent:config-snapshot') return 'Agent config input propagated'
    if (ev.type === 'agent:model-start') return 'Agent model call started'
    if (ev.type === 'agent:model-end') return 'Agent model call completed'
    if (ev.type === 'agent:tool-intent') return 'Agent tool call requested'
    if (ev.type === 'agent:output-delta') return 'Agent output delta'
    if (ev.type === 'agent:thinking-delta') return 'Agent thinking delta'
    if (ev.type === 'agent:tool-start') return 'Agent tool call started'
    if (ev.type === 'agent:tool-retry') return 'Agent tool call retrying'
    if (ev.type === 'agent:tool-end') return 'Agent tool call completed'
    if (ev.type === 'agent:memory-read') return 'Agent memory read'
    if (ev.type === 'agent:memory-write') return 'Agent memory write'
    if (ev.type === 'agent:approval-created') return 'Agent approval requested'
    if (ev.type === 'agent:approval-resumed') return 'Agent approval resumed'
    if (ev.type === 'agent:error') return 'Agent error'
    if (ev.type === 'agent:end') return 'Agent completed'
    return ev.type.replace(':', ' ')
  }

  function recordTimelineEvent(ev: WorkflowEvent) {
    const data = ev.data as { attempt?: number; delayMs?: number } | undefined
    timeline.value.push({
      id: `${ev.type}:${ev.nodeId ?? 'workflow'}:${ev.timestamp}:${timeline.value.length}`,
      type: ev.type,
      nodeId: ev.nodeId,
      triggerNodeId: ev.triggerNodeId,
      jobId: ev.jobId,
      source: ev.source,
      executionId: ev.executionId,
      timestamp: ev.timestamp,
      status: timelineStatusFor(ev.type),
      label: timelineLabelFor(ev),
      description:
        ev.type === 'node:retry'
          ? 'Delay timer started. The next request begins after this wait.'
          : undefined,
      delayMs: ev.type === 'node:retry' ? data?.delayMs : undefined,
      attempt:
        ev.type === 'node:retry'
          ? data?.attempt
          : ev.type === 'node:start' && ev.nodeId
            ? nodeStatuses[ev.nodeId]?.attempts
            : undefined,
      payload: ev.data,
      error: ev.error,
    })
  }

  function appendEditorChatMessage(input: {
    id: string
    sessionId: string
    role: AgentChatMessageRole
    content: unknown
    createdAt?: string
  }) {
    const existing = editorChatMessagesBySession[input.sessionId] ?? []
    const nextMessage: AgentChatMessage = {
      id: input.id,
      profileId: '',
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      createdAt: input.createdAt ?? new Date().toISOString(),
    }
    editorChatMessagesBySession[input.sessionId] = existing.some((message) => message.id === input.id)
      ? existing.map((message) => message.id === input.id ? nextMessage : message)
      : [...existing, nextMessage]
  }

  function streamAssistantMessageId(executionId: string) {
    return `chat-assistant-stream:${executionId}:agent`
  }

  function approvalMessageId(executionId: string, approvalId: string) {
    return `chat-assistant-approval:${executionId}:${approvalId || 'pending'}`
  }

  function assistantStreamTargetMessageId(executionId: string, sessionId: string) {
    const streamMessage = (editorChatMessagesBySession[sessionId] ?? [])
      .find((message) => message.id === streamAssistantMessageId(executionId))

    return approvedToolExecutions.has(executionId) || isApprovalContinuationContent(streamMessage?.content)
      ? toolCompletionMessageId(executionId)
      : streamAssistantMessageId(executionId)
  }

  function removeEditorChatMessage(chatSessionId: string, messageId: string) {
    editorChatMessagesBySession[chatSessionId] = (editorChatMessagesBySession[chatSessionId] ?? [])
      .filter((message) => message.id !== messageId)
  }

  function appendPendingEditorChatAssistantMessage(executionId: string, sessionId: string, timestamp = Date.now()) {
    const id = streamAssistantMessageId(executionId)
    const existing = (editorChatMessagesBySession[sessionId] ?? []).find((message) => message.id === id)
    if (existing) return

    appendEditorChatMessage({
      id,
      sessionId,
      role: 'assistant',
      content: { text: '', thinking: '', pending: true },
      createdAt: new Date(timestamp).toISOString(),
    })
  }

  function appendEditorChatMessageDelta(executionId: string, sessionId: string, delta: string, timestamp: number) {
    if (!delta) return

    const id = assistantStreamTargetMessageId(executionId, sessionId)
    const existing = (editorChatMessagesBySession[sessionId] ?? []).find((message) => message.id === id)
    const content = mergeAssistantChatContent(existing?.content, { textDelta: delta })

    appendEditorChatMessage({
      id,
      sessionId,
      role: 'assistant',
      content,
      createdAt: existing?.createdAt ?? new Date(timestamp).toISOString(),
    })
  }

  function appendEditorChatThinkingDelta(executionId: string, sessionId: string, delta: string, timestamp: number) {
    if (!delta) return

    const id = assistantStreamTargetMessageId(executionId, sessionId)
    const existing = (editorChatMessagesBySession[sessionId] ?? []).find((message) => message.id === id)
    const content = mergeAssistantChatContent(existing?.content, { thinkingDelta: delta })

    appendEditorChatMessage({
      id,
      sessionId,
      role: 'assistant',
      content,
      createdAt: existing?.createdAt ?? new Date(timestamp).toISOString(),
    })
  }

  function toolStatusMessageId(status: EditorChatToolStatus) {
    return `chat-tool-status:${status.executionId}:${status.toolName}`
  }

  function toolCompletionMessageId(executionId: string) {
    return `chat-assistant-tool-completion:${executionId}`
  }

  function upsertEditorChatToolStatus(chatSessionId: string, status: EditorChatToolStatus, timestamp: number) {
    appendEditorChatMessage({
      id: toolStatusMessageId(status),
      sessionId: chatSessionId,
      role: 'assistant',
      content: status,
      createdAt: new Date(timestamp).toISOString(),
    })
  }

  function removeEditorChatToolStatus(chatSessionId: string, executionId: string, toolName: string) {
    const existing = editorChatMessagesBySession[chatSessionId] ?? []
    editorChatMessagesBySession[chatSessionId] = existing.filter((message) =>
      !(
        isToolStatusContent(message.content) &&
        message.content.executionId === executionId &&
        message.content.toolName === toolName
      ),
    )
  }

  function clearExecutionWaitingState(executionId: string) {
    for (const [jobId, job] of Object.entries(activeJobs)) {
      if (job.executionId !== executionId) continue
      if (job.triggerNodeId) {
        _patchNode(job.triggerNodeId, { status: 'idle', endedAt: Date.now() })
        delete triggerStatuses[job.triggerNodeId]
      }
      delete activeJobs[jobId]
    }

    const executionStatuses = nodeStatusesByExecution[executionId] ?? {}
    for (const [nodeId, state] of Object.entries(executionStatuses)) {
      if (state.status !== 'waiting' && state.status !== 'running' && state.status !== 'retrying') continue

      const patch = { status: 'idle' as const, endedAt: Date.now() }
      _patchNode(nodeId, patch)
      _patchExecutionNode(executionId, nodeId, patch)
      delete triggerStatuses[nodeId]
    }
  }

  function rejectEditorChatToolApproval(input: { sessionId: string; executionId: string; toolName: string }) {
    removeEditorChatToolStatus(input.sessionId, input.executionId, input.toolName)
    approvedToolExecutions.delete(input.executionId)
    clearExecutionWaitingState(input.executionId)
  }

  function approveEditorChatToolApproval(input: {
    sessionId: string
    executionId: string
    approvalId: string
    toolName: string
  }) {
    approvedToolExecutions.add(input.executionId)
    removeEditorChatMessage(input.sessionId, approvalMessageId(input.executionId, input.approvalId))
    removeEditorChatMessage(input.sessionId, streamAssistantMessageId(input.executionId))
  }

  function registerEditorChatExecution(executionId: string, chatSessionId: string) {
    editorChatSessionIdByExecution[executionId] = chatSessionId
  }

  function recordEditorChatTriggerReceived(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || !ev.executionId) return

    const data = ev.data as { sessionId?: unknown; message?: unknown } | undefined
    const chatSessionId = typeof data?.sessionId === 'string' ? data.sessionId : undefined
    const message = typeof data?.message === 'string' ? data.message : undefined
    if (!chatSessionId) return

    editorChatSessionIdByExecution[ev.executionId] = chatSessionId
    if (!message) return

    appendEditorChatMessage({
      id: `chat-user:${ev.executionId}`,
      sessionId: chatSessionId,
      role: 'user',
      content: message,
      createdAt: new Date(ev.timestamp).toISOString(),
    })
  }

  function recordEditorChatNodeSuccess(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || !ev.executionId) return
    if (isAiAgentNode(ev.nodeId)) return

    const chatSessionId = editorChatSessionIdByExecution[ev.executionId]
    const output = extractAgentOutput(ev.data)
    if (!chatSessionId || output === undefined) return

    appendEditorChatMessage({
      id: `chat-assistant:${ev.executionId}:${ev.nodeId ?? 'agent'}`,
      sessionId: chatSessionId,
      role: 'assistant',
      content: output,
      createdAt: new Date(ev.timestamp).toISOString(),
    })
  }

  function recordEditorChatAgentOutputDelta(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || ev.type !== 'agent:output-delta' || !ev.executionId) return

    const chatSessionId = editorChatSessionIdByExecution[ev.executionId]
    const delta = extractAgentDelta(ev.data)
    if (!chatSessionId || !delta) return

    appendEditorChatMessageDelta(ev.executionId, chatSessionId, delta, ev.timestamp)
  }

  function recordEditorChatAgentThinkingDelta(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || ev.type !== 'agent:thinking-delta' || !ev.executionId) return

    const chatSessionId = editorChatSessionIdByExecution[ev.executionId]
    const delta = extractAgentDelta(ev.data)
    if (!chatSessionId || !delta) return

    appendEditorChatThinkingDelta(ev.executionId, chatSessionId, delta, ev.timestamp)
  }

  function recordEditorChatToolIntent(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || ev.type !== 'agent:tool-intent' || !ev.executionId) return

    const chatSessionId = editorChatSessionIdByExecution[ev.executionId]
    if (!chatSessionId) return

    const tool = extractToolStatusPayload(ev, 'pending')
    upsertEditorChatToolStatus(chatSessionId, tool, ev.timestamp)
  }

  function recordEditorChatToolStart(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || ev.type !== 'agent:tool-start' || !ev.executionId) return

    const chatSessionId = editorChatSessionIdByExecution[ev.executionId]
    if (!chatSessionId) return

    const tool = extractToolStatusPayload(ev, 'running')
    upsertEditorChatToolStatus(chatSessionId, tool, ev.timestamp)
  }

  function recordEditorChatToolRetry(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || ev.type !== 'agent:tool-retry' || !ev.executionId) return

    const chatSessionId = editorChatSessionIdByExecution[ev.executionId]
    if (!chatSessionId) return

    const tool = extractToolStatusPayload(ev, 'retrying')
    upsertEditorChatToolStatus(chatSessionId, tool, ev.timestamp)
  }

  function recordEditorChatToolEnd(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || ev.type !== 'agent:tool-end' || !ev.executionId) return

    const chatSessionId = editorChatSessionIdByExecution[ev.executionId]
    if (!chatSessionId) return

    const eventStatus = toolPayloadValue(ev.data, 'status') === 'failed' ? 'failed' : 'success'
    const tool = extractToolStatusPayload(ev, eventStatus)
    upsertEditorChatToolStatus(chatSessionId, tool, ev.timestamp)
    if (eventStatus === 'success') lastSuccessfulToolByExecution.set(ev.executionId, tool)
  }

  function recordEditorChatAgentEnd(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || ev.type !== 'agent:end' || !ev.executionId) return

    const chatSessionId = editorChatSessionIdByExecution[ev.executionId]
    const output = extractAgentOutput(ev.data)
    if (!chatSessionId || output === undefined) return
    if (isEmptyAgentOutput(output)) {
      appendToolCompletionMessage(chatSessionId, ev.executionId, ev.timestamp)
      return
    }

    const executionId = ev.executionId
    const existing = (editorChatMessagesBySession[chatSessionId] ?? [])
      .find((message) => message.id === streamAssistantMessageId(executionId))

    if (approvedToolExecutions.has(executionId) || isApprovalContinuationContent(existing?.content)) {
      if (hasToolCompletionTextForExecution(chatSessionId, executionId)) return
      appendFinalAssistantMessage(chatSessionId, executionId, output, ev.timestamp)
      return
    }

    appendEditorChatMessage({
      id: streamAssistantMessageId(ev.executionId),
      sessionId: chatSessionId,
      role: 'assistant',
      content: mergeAssistantChatContent(existing?.content, { text: output }),
      createdAt: new Date(ev.timestamp).toISOString(),
    })
  }

  function recordEditorChatJobFailure(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || !ev.executionId || !ev.error) return
    agentFailuresByExecution.add(ev.executionId)

    const chatSessionId = editorChatSessionIdByExecution[ev.executionId]
    if (!chatSessionId || hasAssistantMessageForExecution(chatSessionId, ev.executionId)) return

    appendEditorChatMessage({
      id: `chat-assistant-error:${ev.executionId}`,
      sessionId: chatSessionId,
      role: 'assistant',
      content: `Chat run failed. ${ev.error}`,
      createdAt: new Date(ev.timestamp).toISOString(),
    })
  }

  function recordEditorChatAgentFailure(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || ev.type !== 'agent:error' || !ev.executionId) return
    agentFailuresByExecution.add(ev.executionId)

    const chatSessionId = editorChatSessionIdByExecution[ev.executionId]
    if (!chatSessionId) return

    appendEditorChatMessage({
      id: hasStreamAssistantMessageForExecution(chatSessionId, ev.executionId)
        ? streamAssistantMessageId(ev.executionId)
        : `chat-assistant-error:${ev.executionId}:agent-error`,
      sessionId: chatSessionId,
      role: 'assistant',
      content: `Chat run failed. ${extractAgentError(ev.data) ?? ev.error ?? 'Agent execution failed.'}`,
      createdAt: new Date(ev.timestamp).toISOString(),
    })
  }

  function recordEditorChatApprovalCreated(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || ev.type !== 'agent:approval-created' || !ev.executionId) return

    const executionId = ev.executionId
    const chatSessionId = editorChatSessionIdByExecution[executionId]
    if (!chatSessionId) return

    const toolName = approvalPayloadValue(ev.data, 'toolName') || 'agent tool'
    const approvalId = approvalPayloadValue(ev.data, 'approvalId')
    const existing = (editorChatMessagesBySession[chatSessionId] ?? [])
      .find((message) => message.id === streamAssistantMessageId(executionId))

    appendEditorChatMessage({
      id: approvalMessageId(executionId, approvalId),
      sessionId: chatSessionId,
      role: 'assistant',
      content: {
        text: `Tool approval required for ${toolName}. Review the approval panel to continue.`,
        thinking: normalizeAssistantChatContent(existing?.content).thinking,
        pending: false,
        approvalId,
        executionId,
        toolName,
        sideEffect: approvalPayloadValue(ev.data, 'sideEffect'),
      },
      createdAt: existing?.createdAt ?? new Date(ev.timestamp).toISOString(),
    })
    removeEditorChatMessage(chatSessionId, streamAssistantMessageId(executionId))
  }

  function recordEditorChatJobSuccess(ev: WorkflowEvent) {
    if (ev.source !== 'chat' || !ev.executionId) return
    if (agentFailuresByExecution.has(ev.executionId)) return

    const chatSessionId = editorChatSessionIdByExecution[ev.executionId]
    if (!chatSessionId || hasAssistantMessageForExecution(chatSessionId, ev.executionId)) return

    appendEditorChatMessage({
      id: `chat-assistant-empty:${ev.executionId}`,
      sessionId: chatSessionId,
      role: 'assistant',
      content: 'Message received, but this Chat Trigger is not connected to an AI Agent yet. Add an AI Agent with a Chat Model to get a reply.',
      createdAt: new Date(ev.timestamp).toISOString(),
    })
  }

  function appendToolCompletionMessage(chatSessionId: string, executionId: string, timestamp: number) {
    const tool = lastSuccessfulToolByExecution.get(executionId)
    if (!tool || hasAssistantTextForExecution(chatSessionId, executionId)) return

    appendEditorChatMessage({
      id: toolCompletionMessageId(executionId),
      sessionId: chatSessionId,
      role: 'assistant',
      content: {
        text: formatToolCompletionMessage(tool, detectChatLocale(lastUserMessageText(chatSessionId))),
        pending: false,
      },
      createdAt: new Date(timestamp).toISOString(),
    })
  }

  function appendFinalAssistantMessage(chatSessionId: string, executionId: string, output: unknown, timestamp: number) {
    appendEditorChatMessage({
      id: toolCompletionMessageId(executionId),
      sessionId: chatSessionId,
      role: 'assistant',
      content: {
        text: typeof output === 'string' ? output : JSON.stringify(output),
        pending: false,
      },
      createdAt: new Date(timestamp).toISOString(),
    })
  }

  function hasAssistantMessageForExecution(chatSessionId: string, executionId: string): boolean {
    return (editorChatMessagesBySession[chatSessionId] ?? []).some((message) =>
      message.role === 'assistant' && message.id.includes(executionId) && !isToolStatusContent(message.content),
    )
  }

  function hasAssistantTextForExecution(chatSessionId: string, executionId: string): boolean {
    return (editorChatMessagesBySession[chatSessionId] ?? []).some((message) =>
      message.role === 'assistant' &&
      message.id.includes(executionId) &&
      !isToolStatusContent(message.content) &&
      !isApprovalContinuationContent(message.content) &&
      Boolean(messageContentText(message.content).trim()),
    )
  }

  function hasStreamAssistantMessageForExecution(chatSessionId: string, executionId: string): boolean {
    return (editorChatMessagesBySession[chatSessionId] ?? []).some((message) =>
      message.role === 'assistant' && message.id === streamAssistantMessageId(executionId),
    )
  }

  function hasToolCompletionTextForExecution(chatSessionId: string, executionId: string): boolean {
    return (editorChatMessagesBySession[chatSessionId] ?? []).some((message) =>
      message.role === 'assistant' &&
      message.id === toolCompletionMessageId(executionId) &&
      Boolean(messageContentText(message.content).trim()),
    )
  }

  function extractAgentOutput(data: unknown): unknown {
    if (!data || typeof data !== 'object') return undefined
    const record = data as Record<string, unknown>
    if ('output' in record) return record.output
    return undefined
  }

  function isEmptyAgentOutput(output: unknown): boolean {
    return output === '' || output === null || (typeof output === 'object' && output !== null && !Array.isArray(output) && Object.keys(output).length === 0)
  }

  function extractAgentDelta(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined
    const delta = (data as Record<string, unknown>).delta
    return typeof delta === 'string' ? delta : undefined
  }

  function mergeAssistantChatContent(
    content: unknown,
    patch: { text?: unknown; textDelta?: string; thinkingDelta?: string },
  ) {
    const current = normalizeAssistantChatContent(content)
    return {
      text: patch.text !== undefined
        ? (typeof patch.text === 'string' ? patch.text : JSON.stringify(patch.text))
        : current.approvalContinuation && patch.textDelta !== undefined
          ? patch.textDelta
          : `${current.text}${patch.textDelta ?? ''}`,
      thinking: `${current.thinking}${patch.thinkingDelta ?? ''}`,
      pending: false,
    }
  }

  function extractToolStatusPayload(ev: WorkflowEvent, status: EditorChatToolStatus['status']): EditorChatToolStatus {
    return {
      kind: 'toolStatus',
      executionId: ev.executionId ?? '',
      callId: toolPayloadValue(ev.data, 'callId'),
      toolName: toolPayloadValue(ev.data, 'name') || toolPayloadValue(ev.data, 'tool') || 'agent tool',
      pluginName: toolPayloadValue(ev.data, 'pluginName'),
      status,
      requiresApproval: toolPayloadBoolean(ev.data, 'requiresApproval'),
      error: toolPayloadValue(ev.data, 'error') || ev.error,
    }
  }

  function toolPayloadValue(data: unknown, key: string): string {
    if (!data || typeof data !== 'object') return ''
    const value = (data as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : ''
  }

  function toolPayloadBoolean(data: unknown, key: string): boolean | undefined {
    if (!data || typeof data !== 'object') return undefined
    const value = (data as Record<string, unknown>)[key]
    return typeof value === 'boolean' ? value : undefined
  }

  function formatToolCompletionMessage(tool: EditorChatToolStatus, locale: 'pt' | 'en' = 'en'): string {
    if (locale === 'pt') {
      return `Pronto, usei ${tool.toolName}${tool.pluginName ? ` do plugin ${tool.pluginName}` : ''} com sucesso. Quer executar mais alguma acao?`
    }

    return `Done, I used ${tool.toolName}${tool.pluginName ? ` from ${tool.pluginName}` : ''} successfully. Do you want to run another action?`
  }

  function lastUserMessageText(chatSessionId: string): unknown {
    return [...(editorChatMessagesBySession[chatSessionId] ?? [])]
      .reverse()
      .find((message) => message.role === 'user')
      ?.content
  }

  function detectChatLocale(value: unknown): 'pt' | 'en' {
    const text = typeof value === 'string' ? value.toLowerCase() : ''
    return /[ãõçáéíóúâêô]|\b(voce|você|qual|pode|poderia|enviar|mensagem|piada|para|meu|minha|bom dia|boa noite)\b/.test(text)
      ? 'pt'
      : 'en'
  }

  function messageContentText(content: unknown): string {
    if (isToolStatusContent(content)) return ''
    if (content && typeof content === 'object' && !Array.isArray(content)) {
      const text = (content as Record<string, unknown>).text
      return typeof text === 'string' ? text : ''
    }
    return typeof content === 'string' ? content : ''
  }

  function normalizeAssistantChatContent(content: unknown): { text: string; thinking: string; approvalContinuation: boolean } {
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return { text: typeof content === 'string' ? content : '', thinking: '', approvalContinuation: false }
    }

    const record = content as Record<string, unknown>
    return {
      text: typeof record.text === 'string' ? record.text : '',
      thinking: typeof record.thinking === 'string' ? record.thinking : '',
      approvalContinuation: record.approvalContinuation === true,
    }
  }

  function extractAgentError(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined
    const record = data as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
    if (typeof record.code === 'string') return record.code
    return undefined
  }

  function agentPayloadValue(data: unknown, key: string): unknown {
    if (!data || typeof data !== 'object') return undefined
    return (data as Record<string, unknown>)[key]
  }

  function approvalPayloadValue(data: unknown, key: string): string {
    if (!data || typeof data !== 'object') return ''
    const value = (data as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : ''
  }

  function isToolStatusContent(content: unknown): content is EditorChatToolStatus {
    return Boolean(content && typeof content === 'object' && !Array.isArray(content) && (content as { kind?: unknown }).kind === 'toolStatus')
  }

  function isApprovalContinuationContent(content: unknown): boolean {
    return Boolean(content && typeof content === 'object' && !Array.isArray(content) && (content as { approvalContinuation?: unknown }).approvalContinuation === true)
  }

  function isAiAgentNode(nodeId: string | undefined): boolean {
    if (!nodeId) return false
    return useWorkflowStore().activeWorkflow?.nodes[nodeId]?.type === 'ai-agent'
  }

  function patchNodeStatus(nodeId: string, patch: Partial<NodeExecutionState>) {
    _patchNode(nodeId, patch)
  }

  function patchConnectedAgentConfigNode(
    agentNodeId: string | undefined,
    targetHandle: 'chatModel' | 'memory' | 'tool',
    patch: Partial<NodeExecutionState>,
    eventData?: unknown,
  ) {
    if (!agentNodeId) return
    const workflow = useWorkflowStore().activeWorkflow
    const edges = workflow?.edges.filter((edge) =>
      edge.target === agentNodeId && edge.targetHandle === targetHandle,
    )
    const event = eventData && typeof eventData === 'object' ? eventData as Record<string, unknown> : {}
    const edge = targetHandle === 'tool'
      ? edges?.find((candidate) => {
          const node = workflow?.nodes[candidate.source]
          return node?.type === 'ai-tool' &&
            (!event.pluginId || node.pluginId === event.pluginId) &&
            (!event.methodId || node.methodId === event.methodId)
        }) ?? edges?.[0]
      : edges?.[0]
    if (!edge) return
    _patchNode(edge.source, patch)
  }

  function patchConnectedAgentConfigNodes(
    agentNodeId: string | undefined,
    targetHandle: 'chatModel' | 'memory' | 'tool',
    patch: Partial<NodeExecutionState>,
  ) {
    if (!agentNodeId) return
    const workflow = useWorkflowStore().activeWorkflow
    for (const edge of workflow?.edges.filter((candidate) =>
      candidate.target === agentNodeId && candidate.targetHandle === targetHandle,
    ) ?? []) {
      _patchNode(edge.source, patch)
    }
  }

  function patchAgentConfigSnapshot(ev: WorkflowEvent) {
    const patch = { input: agentPayloadValue(ev.data, 'input') }
    patchConnectedAgentConfigNodes(ev.nodeId, 'chatModel', patch)
    patchConnectedAgentConfigNodes(ev.nodeId, 'memory', patch)
    patchConnectedAgentConfigNodes(ev.nodeId, 'tool', patch)
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Clears all node execution state and resets the workflow status. */
  function resetNodeStatuses() {
    // Delete individual keys so the reactive proxy stays intact
    for (const key of Object.keys(nodeStatuses)) {
      delete nodeStatuses[key]
    }
    workflowStatus.value = null
    sessionStatus.value = null
    activeSessionId.value = null
    activeExecutionId.value = null
    timeline.value = []
    for (const key of Object.keys(activeJobs)) delete activeJobs[key]
    for (const key of Object.keys(triggerStatuses)) delete triggerStatuses[key]
    for (const key of Object.keys(nodeStatusesByExecution)) delete nodeStatusesByExecution[key]
    agentFailuresByExecution.clear()
    lastSuccessfulToolByExecution.clear()
  }

  /** Marks the trigger node as 'running' (e.g. waiting for a form submission). */
  function setTriggerRunning(triggerNodeId = 'trigger') {
    _patchNode(triggerNodeId, { status: 'running', startedAt: Date.now() })
  }

  function markRunningTriggersSuccess(timestamp: number) {
    for (const [nodeId, state] of Object.entries(nodeStatuses)) {
      if (state?.status === 'running' && nodeId.startsWith('trigger')) {
        _patchNode(nodeId, { status: 'success', endedAt: timestamp })
      }
    }
  }

  /** Closes any open EventSource connection. */
  function stopStream() {
    if (_es) {
      _es.close()
      _es = null
    }
  }

  /**
   * Opens an SSE connection for `executionId`.
   *
   * IMPORTANT: The server writes every event as a bare `data:` line with no
   * `event:` name prefix:
   *
   *   data: {"type":"node:start","nodeId":"...", ...}\n\n
   *
   * This means the browser fires them all as the default `message` event, not
   * as named events. We therefore listen on `_es.onmessage` and dispatch on
   * `event.type` from the parsed payload — NOT via `addEventListener('node:start', ...)`.
   */
  function startStream(executionId: string): void {
    stopStream()
    activeExecutionId.value = executionId
    isStreaming.value = true

    const { success, error: toastError } = useToast()

    _es = workflowsApi.createExecutionStream(executionId)

    _es.onopen = () => {}

    _es.onmessage = (rawEvt: MessageEvent) => {
      try {
        const ev = JSON.parse(rawEvt.data as string) as WorkflowEvent
        recordTimelineEvent(ev)

            switch (ev.type) {
              case 'agent:config-snapshot':
                patchAgentConfigSnapshot(ev)
                break

              case 'trigger:data':
            _patchNode(ev.nodeId ?? 'trigger', {
              status: 'success',
              output: ev.data,
              endedAt: ev.timestamp,
            })
            break

          case 'node:start':
            if (ev.nodeId) {
              markRunningTriggersSuccess(ev.timestamp)
              _patchNode(ev.nodeId, { status: 'running', startedAt: ev.timestamp })
            }
            break

          case 'node:retry':
            if (ev.nodeId) {
              const data = ev.data as { attempt?: number; delayMs?: number } | undefined
              const previous = nodeStatuses[ev.nodeId]?.retries ?? []
              _patchNode(ev.nodeId, {
                status: 'retrying',
                attempts: data?.attempt,
                error: ev.error,
                retries: [
                  ...previous,
                  {
                    attempt: data?.attempt ?? previous.length + 2,
                    delayMs: data?.delayMs ?? 0,
                    error: ev.error,
                    at: ev.timestamp,
                  },
                ],
              })
            }
            break

          case 'temporary-form:created':
            if (ev.nodeId) {
              _patchNode(ev.nodeId, {
                status: 'running',
                output: ev.data,
                startedAt: ev.timestamp,
              })
            }
            break

          case 'node:success':
            if (ev.nodeId) {
              _patchNode(ev.nodeId, {
                status: 'success',
                output: ev.data,
                endedAt: ev.timestamp,
                attempts: nodeStatuses[ev.nodeId]?.attempts ?? 1,
              })
            }
            break

          case 'node:failed':
            if (ev.nodeId) {
              _patchNode(ev.nodeId, {
                status: 'failed',
                error: ev.error,
                endedAt: ev.timestamp,
                attempts: nodeStatuses[ev.nodeId]?.attempts ?? 1,
              })
              toastError(ev.error ?? `Node "${ev.nodeId}" failed`, 'Node execution failed')
            }
            break

          case 'workflow:success':
            workflowStatus.value = 'SUCCESS'
            markRunningTriggersSuccess(ev.timestamp)
            isStreaming.value = false
            stopStream()
            success('Workflow completed successfully')
            break

          case 'workflow:failed':
            workflowStatus.value = 'FAILED'
            markRunningTriggersSuccess(ev.timestamp)
            isStreaming.value = false
            stopStream()
            toastError('Workflow execution failed', 'Workflow failed')
            break

          case 'workflow:cancelled':
            workflowStatus.value = 'CANCELLED'
            clearTransientNodeStatuses()
            isStreaming.value = false
            stopStream()
            useToast().warning('Workflow execution cancelled')
            break

          default:
            break
        }
      } catch {
      }
    }

    _es.onerror = () => {
      if (isStreaming.value) {
        isStreaming.value = false
        stopStream()
        useToast().error('Execution stream disconnected')
      }
    }
  }

  function startSessionStream(sessionId: string): void {
    stopStream()
    activeSessionId.value = sessionId
    sessionStatus.value = 'running'
    isStreaming.value = true

    const { error: toastError } = useToast()
    _es = workflowsApi.createDevSessionStream(sessionId)

    _es.onmessage = (rawEvt: MessageEvent) => {
      try {
        const ev = JSON.parse(rawEvt.data as string) as WorkflowEvent
        recordTimelineEvent(ev)

            switch (ev.type) {
              case 'agent:config-snapshot':
                patchAgentConfigSnapshot(ev)
                break

              case 'session:start':
          case 'session:ready':
            sessionStatus.value = 'running'
            break

          case 'trigger:waiting':
            if (ev.triggerNodeId) {
              triggerStatuses[ev.triggerNodeId] = 'waiting'
              _patchNode(ev.triggerNodeId, { status: 'waiting', startedAt: ev.timestamp })
            }
            break

          case 'trigger:received':
            recordEditorChatTriggerReceived(ev)
            if (ev.triggerNodeId) {
              triggerStatuses[ev.triggerNodeId] = 'received'
              _patchNode(ev.triggerNodeId, { output: ev.data, startedAt: ev.timestamp })
            }
            break

          case 'job:queued':
            if (ev.jobId) activeJobs[ev.jobId] = ev
            if (ev.executionId) activeExecutionId.value = ev.executionId
            break

          case 'job:start':
            if (ev.jobId) activeJobs[ev.jobId] = ev
            if (ev.executionId) activeExecutionId.value = ev.executionId
            workflowStatus.value = 'RUNNING'
            if (ev.triggerNodeId) {
              triggerStatuses[ev.triggerNodeId] = 'running'
              _patchNode(ev.triggerNodeId, { status: 'running', startedAt: ev.timestamp })
            }
            break

          case 'node:start':
            if (ev.nodeId) {
              _patchNode(ev.nodeId, { status: 'running', startedAt: ev.timestamp })
              _patchExecutionNode(ev.executionId, ev.nodeId, { status: 'running', startedAt: ev.timestamp })
            }
            break

          case 'node:success':
            recordEditorChatNodeSuccess(ev)
            if (ev.nodeId) {
              const patch = {
                status: 'success',
                output: ev.data,
                endedAt: ev.timestamp,
                attempts: nodeStatuses[ev.nodeId]?.attempts ?? 1,
              } satisfies Partial<NodeExecutionState>
              _patchNode(ev.nodeId, patch)
              _patchExecutionNode(ev.executionId, ev.nodeId, patch)
            }
            break

          case 'node:failed':
            if (ev.nodeId) {
              const patch = {
                status: 'failed',
                error: ev.error,
                endedAt: ev.timestamp,
                attempts: nodeStatuses[ev.nodeId]?.attempts ?? 1,
              } satisfies Partial<NodeExecutionState>
              _patchNode(ev.nodeId, patch)
              _patchExecutionNode(ev.executionId, ev.nodeId, patch)
              toastError(ev.error ?? `Node "${ev.nodeId}" failed`, 'Node execution failed')
            }
              break

          case 'agent:output-delta':
            recordEditorChatAgentOutputDelta(ev)
            if (ev.nodeId) {
              _patchNode(ev.nodeId, { status: 'running', startedAt: ev.timestamp })
              _patchExecutionNode(ev.executionId, ev.nodeId, { status: 'running', startedAt: ev.timestamp })
            }
            break

          case 'agent:thinking-delta':
            recordEditorChatAgentThinkingDelta(ev)
            if (ev.nodeId) {
              _patchNode(ev.nodeId, { status: 'running', startedAt: ev.timestamp })
              _patchExecutionNode(ev.executionId, ev.nodeId, { status: 'running', startedAt: ev.timestamp })
            }
            break

          case 'agent:tool-intent':
            recordEditorChatToolIntent(ev)
            patchConnectedAgentConfigNode(ev.nodeId, 'tool', {
              status: 'waiting',
              input: agentPayloadValue(ev.data, 'input'),
              output: ev.data,
              startedAt: ev.timestamp,
            }, ev.data)
            break

          case 'agent:tool-start':
            recordEditorChatToolStart(ev)
            patchConnectedAgentConfigNode(ev.nodeId, 'tool', {
              status: 'running',
              input: agentPayloadValue(ev.data, 'input'),
              output: ev.data,
              startedAt: ev.timestamp,
            }, ev.data)
            break

          case 'agent:tool-retry':
            recordEditorChatToolRetry(ev)
            patchConnectedAgentConfigNode(ev.nodeId, 'tool', {
              status: 'retrying',
              input: agentPayloadValue(ev.data, 'input'),
              output: ev.data,
              startedAt: ev.timestamp,
            }, ev.data)
            break

          case 'agent:tool-end':
            recordEditorChatToolEnd(ev)
            patchConnectedAgentConfigNode(ev.nodeId, 'tool', {
              status: toolPayloadValue(ev.data, 'status') === 'failed' ? 'failed' : 'success',
              output: ev.data,
              error: toolPayloadValue(ev.data, 'error') || ev.error,
              endedAt: ev.timestamp,
            }, ev.data)
            break

          case 'agent:end':
            recordEditorChatAgentEnd(ev)
            if (ev.nodeId) {
              const patch = {
                status: 'success',
                output: ev.data,
                endedAt: ev.timestamp,
              } satisfies Partial<NodeExecutionState>
              _patchNode(ev.nodeId, patch)
              _patchExecutionNode(ev.executionId, ev.nodeId, patch)
            }
            break

          case 'agent:model-start':
            patchConnectedAgentConfigNode(ev.nodeId, 'chatModel', {
              status: 'running',
              input: agentPayloadValue(ev.data, 'input'),
              startedAt: ev.timestamp,
            })
            break

          case 'agent:model-end':
            patchConnectedAgentConfigNode(ev.nodeId, 'chatModel', {
              status: 'success',
              output: agentPayloadValue(ev.data, 'output') ?? ev.data,
              endedAt: ev.timestamp,
            })
            break

          case 'agent:memory-read':
          case 'agent:memory-write':
            patchConnectedAgentConfigNode(ev.nodeId, 'memory', {
              status: 'success',
              input: agentPayloadValue(ev.data, 'input'),
              output: agentPayloadValue(ev.data, 'output') ?? ev.data,
              endedAt: ev.timestamp,
            })
            break

          case 'agent:error':
            recordEditorChatAgentFailure(ev)
            patchConnectedAgentConfigNode(ev.nodeId, 'tool', {
              status: 'failed',
              error: extractAgentError(ev.data) ?? ev.error,
              endedAt: ev.timestamp,
            }, ev.data)
            patchConnectedAgentConfigNode(ev.nodeId, 'chatModel', {
              status: 'failed',
              error: extractAgentError(ev.data) ?? ev.error,
              endedAt: ev.timestamp,
            })
            break

          case 'agent:approval-created':
            recordEditorChatApprovalCreated(ev)
            if (ev.nodeId) {
              const patch = {
                status: 'waiting',
                output: ev.data,
                endedAt: ev.timestamp,
              } satisfies Partial<NodeExecutionState>
              _patchNode(ev.nodeId, patch)
              _patchExecutionNode(ev.executionId, ev.nodeId, patch)
            }
            patchConnectedAgentConfigNode(ev.nodeId, 'tool', {
              status: 'waiting',
              output: ev.data,
              endedAt: ev.timestamp,
            }, ev.data)
            break

          case 'job:success':
            workflowStatus.value = 'SUCCESS'
            recordEditorChatJobSuccess(ev)
            if (ev.triggerNodeId) {
              triggerStatuses[ev.triggerNodeId] = 'success'
              _patchNode(ev.triggerNodeId, { status: 'success', endedAt: ev.timestamp })
              _patchExecutionNode(ev.executionId, ev.triggerNodeId, { status: 'success', endedAt: ev.timestamp })
            }
            break

          case 'job:failed':
            workflowStatus.value = 'FAILED'
            recordEditorChatJobFailure(ev)
            if (ev.triggerNodeId) {
              triggerStatuses[ev.triggerNodeId] = 'failed'
              _patchNode(ev.triggerNodeId, { status: 'failed', error: ev.error, endedAt: ev.timestamp })
              _patchExecutionNode(ev.executionId, ev.triggerNodeId, { status: 'failed', error: ev.error, endedAt: ev.timestamp })
            }
            toastError(ev.error ?? 'Workflow job failed', 'Job failed')
            break

          case 'job:cancelled':
            workflowStatus.value = 'CANCELLED'
            clearExecutionWaitingState(ev.executionId ?? '')
            break

          case 'session:stopping':
            sessionStatus.value = 'stopping'
            clearTransientNodeStatuses()
            break

          case 'session:stopped':
            sessionStatus.value = 'stopped'
            isStreaming.value = false
            clearTransientNodeStatuses()
            stopStream()
            useToast().success('Dev session stopped')
            break

          default:
            break
        }
      } catch {
      }
    }

    _es.onerror = () => {
      if (isStreaming.value) {
        isStreaming.value = false
        stopStream()
        useToast().error('Dev session stream disconnected')
      }
    }
  }

  /**
   * Kicks off a workflow execution:
   * 1. Resets previous node statuses so the canvas is clean
   * 2. Opens the SSE stream with a client-generated ID *before* the POST,
   *    preventing any early `node:start` events from being missed
   * 3. POSTs to the execute endpoint
   * 4. If the server returns a different execution ID, reconnects the stream
   */
  async function execute(workflowId: string, payload: Record<string, unknown> = {}, triggerNodeId?: string) {
    const { error: toastError } = useToast()

    resetNodeStatuses()

    isExecuting.value = true
    try {
      const result = await workflowsApi.createDevSession(workflowId, payload, triggerNodeId)
      activeSessionId.value = result.sessionId
      sessionStatus.value = result.status

      // Pre-patch ALL triggers from the HTTP response (reliable — avoids SSE race condition
      // where trigger:waiting events fire before the client stream connects).
      // • Manual triggers: server queues them ALL immediately → show 'running' (orange shimmer)
      // • Non-manual (webhook/cron/event/plugin): waiting for their external event → show 'waiting' (purple)
      for (const trigger of result.triggers) {
        if (trigger.type === 'manual') {
          if (trigger.triggerNodeId === triggerNodeId) {
            triggerStatuses[trigger.triggerNodeId] = 'running'
            _patchNode(trigger.triggerNodeId, { status: 'running', startedAt: Date.now() })
          }
        } else {
          triggerStatuses[trigger.triggerNodeId] = 'waiting'
          _patchNode(trigger.triggerNodeId, { status: 'waiting', startedAt: Date.now() })
        }
      }

      startSessionStream(result.sessionId)
    } catch {
      isStreaming.value = false
      stopStream()
      toastError('Failed to start workflow execution')
      throw new Error('Execution failed')
    } finally {
      isExecuting.value = false
    }
  }

  async function executeTrigger(
    workflowId: string,
    triggerNodeId: string,
    payload: Record<string, unknown> = {},
  ) {
    const sessionId = activeSessionId.value
    if (!sessionId || sessionStatus.value !== 'running') {
      await execute(workflowId, payload, triggerNodeId)
      return
    }

    const { error: toastError } = useToast()
    isExecuting.value = true
    try {
      triggerStatuses[triggerNodeId] = 'running'
      _patchNode(triggerNodeId, { status: 'running', startedAt: Date.now() })
      const result = await workflowsApi.executeDevSessionTrigger(sessionId, triggerNodeId, payload)
      activeExecutionId.value = result.executionId
    } catch {
      triggerStatuses[triggerNodeId] = 'failed'
      _patchNode(triggerNodeId, { status: 'failed', endedAt: Date.now() })
      toastError('Failed to execute trigger')
      throw new Error('Trigger execution failed')
    } finally {
      isExecuting.value = false
    }
  }

  async function executeFormSubmission(
    formId: string,
    mode: 'test' | 'prod',
    payload: Record<string, unknown> = {},
  ) {
    const { error: toastError } = useToast()

    resetNodeStatuses()

    const clientExecId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    startStream(clientExecId)

    isExecuting.value = true
    try {
      const result = await workflowsApi.submitForm(formId, mode, payload, clientExecId)
      if (result.executionId && result.executionId !== clientExecId) {
        startStream(result.executionId)
      }
    } catch {
      isStreaming.value = false
      stopStream()
      toastError('Failed to submit form trigger')
      throw new Error('Form submission failed')
    } finally {
      isExecuting.value = false
    }
  }

  /** Sends a cancel request for the active execution (fire-and-forget UX). */
  async function cancel() {
    if (!activeSessionId.value && !activeExecutionId.value) return
    const { error: toastError } = useToast()
    try {
      if (activeSessionId.value) {
        sessionStatus.value = 'stopping'
        await workflowsApi.stopDevSession(activeSessionId.value)
      } else if (activeExecutionId.value) {
        await workflowsApi.cancelExecution(activeExecutionId.value)
      }
    } catch {
      toastError('Failed to cancel execution')
    }
  }

  return {
    nodeStatuses,
    timeline,
    isStreaming,
    isExecuting,
    activeExecutionId,
    activeSessionId,
    sessionStatus,
    activeJobs,
    triggerStatuses,
    nodeStatusesByExecution,
    editorChatMessagesBySession,
    workflowStatus,
    hasActiveExecution,
    execute,
    executeTrigger,
    executeFormSubmission,
    cancel,
    startStream,
    stopStream,
    resetNodeStatuses,
    setTriggerRunning,
    patchNodeStatus,
    approveEditorChatToolApproval,
    rejectEditorChatToolApproval,
    appendEditorChatMessage,
    appendEditorChatMessageDelta,
    appendPendingEditorChatAssistantMessage,
    registerEditorChatExecution,
  }
})
