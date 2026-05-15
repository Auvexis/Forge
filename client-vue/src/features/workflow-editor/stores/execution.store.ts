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
  /** Tracks which trigger node IDs are of type 'manual' — used to decide reset target after job ends */
  const manualTriggerNodeIds = new Set<string>()

  /** Last known overall workflow execution outcome */
  const workflowStatus = ref<WorkflowExecutionStatus | null>(null)
  const timeline = ref<ExecutionTimelineEvent[]>([])

  // Internal EventSource — intentionally non-reactive (DOM object)
  let _es: EventSource | null = null
  const clearStatusTimers = new Map<string, ReturnType<typeof setTimeout>>()

  // ── Derived ──────────────────────────────────────────────────────────────

  const hasActiveExecution = computed(() => isStreaming.value || isExecuting.value || sessionStatus.value === 'running')

  // ── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Merges `patch` into the state for `nodeId`.
   * In-place mutation on the reactive record triggers per-key tracking.
   */
  function _patchNode(nodeId: string, patch: Partial<NodeExecutionState>) {
    if (patch.status && patch.status !== 'idle') clearNodeStatusTimer(nodeId)
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

  function clearNodeStatusTimer(nodeId: string) {
    const timer = clearStatusTimers.get(nodeId)
    if (timer) clearTimeout(timer)
    clearStatusTimers.delete(nodeId)
  }

  function clearNodeStatusLater(nodeId: string, expectedStatus: NodeExecutionState['status'], delayMs = 1800, resetTo: NodeExecutionState['status'] = 'idle') {
    clearNodeStatusTimer(nodeId)
    clearStatusTimers.set(
      nodeId,
      setTimeout(() => {
        const current = nodeStatuses[nodeId]
        if (current?.status === expectedStatus) {
          nodeStatuses[nodeId] = { ...current, status: resetTo }
        }
        if (resetTo === 'waiting') {
          triggerStatuses[nodeId] = 'waiting'
        } else {
          delete triggerStatuses[nodeId]
        }
        clearStatusTimers.delete(nodeId)
      }, delayMs),
    )
  }

  function clearTransientNodeStatuses() {
    for (const timer of clearStatusTimers.values()) clearTimeout(timer)
    clearStatusTimers.clear()

    for (const [nodeId, state] of Object.entries(nodeStatuses)) {
      if (state?.status === 'waiting' || state?.status === 'running' || state?.status === 'retrying') {
        nodeStatuses[nodeId] = { ...state, status: 'idle' }
      }
    }

    for (const key of Object.keys(triggerStatuses)) delete triggerStatuses[key]
    for (const key of Object.keys(activeJobs)) delete activeJobs[key]
  }

  function timelineStatusFor(type: string): ExecutionTimelineEvent['status'] {
    if (type === 'node:success' || type === 'workflow:success' || type === 'trigger:data' || type === 'job:success') return 'success'
    if (type === 'node:failed' || type === 'workflow:failed' || type === 'job:failed') return 'failed'
    if (type === 'node:retry') return 'retrying'
    if (type === 'workflow:cancelled' || type === 'job:cancelled') return 'cancelled'
    if (type === 'node:start' || type === 'workflow:start' || type === 'temporary-form:created' || type === 'job:start') {
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
    return ev.type.replace(':', ' ')
  }

  function recordTimelineEvent(ev: WorkflowEvent) {
    const data = ev.data as { attempt?: number; delayMs?: number } | undefined
    timeline.value.push({
      id: `${ev.type}:${ev.nodeId ?? 'workflow'}:${ev.timestamp}:${timeline.value.length}`,
      type: ev.type,
      nodeId: ev.nodeId,
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

  function patchNodeStatus(nodeId: string, patch: Partial<NodeExecutionState>) {
    _patchNode(nodeId, patch)
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Clears all node execution state and resets the workflow status. */
  function resetNodeStatuses() {
    // Delete individual keys so the reactive proxy stays intact
    for (const key of Object.keys(nodeStatuses)) {
      delete nodeStatuses[key]
    }
    for (const timer of clearStatusTimers.values()) clearTimeout(timer)
    clearStatusTimers.clear()
    workflowStatus.value = null
    sessionStatus.value = null
    activeSessionId.value = null
    activeExecutionId.value = null
    timeline.value = []
    for (const key of Object.keys(activeJobs)) delete activeJobs[key]
    for (const key of Object.keys(triggerStatuses)) delete triggerStatuses[key]
    for (const key of Object.keys(nodeStatusesByExecution)) delete nodeStatusesByExecution[key]
    manualTriggerNodeIds.clear()
  }

  /** Marks the trigger node as 'running' (e.g. waiting for a form submission). */
  function setTriggerRunning(triggerNodeId = 'trigger') {
    _patchNode(triggerNodeId, { status: 'running', startedAt: Date.now() })
  }

  function markRunningTriggersSuccess(timestamp: number) {
    for (const [nodeId, state] of Object.entries(nodeStatuses)) {
      if (state?.status === 'running' && nodeId.startsWith('trigger')) {
        _patchNode(nodeId, { status: 'success', endedAt: timestamp })
        clearNodeStatusLater(nodeId, 'success')
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
            if (ev.nodeId) {
              const patch = {
                status: 'success',
                output: ev.data,
                endedAt: ev.timestamp,
                attempts: nodeStatuses[ev.nodeId]?.attempts ?? 1,
              } satisfies Partial<NodeExecutionState>
              _patchNode(ev.nodeId, patch)
              _patchExecutionNode(ev.executionId, ev.nodeId, patch)
              clearNodeStatusLater(ev.nodeId, 'success')
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
              clearNodeStatusLater(ev.nodeId, 'failed', 3000)
            }
            break

          case 'job:success':
            if (ev.triggerNodeId) {
              const isManual = manualTriggerNodeIds.has(ev.triggerNodeId)
              triggerStatuses[ev.triggerNodeId] = 'success'
              _patchNode(ev.triggerNodeId, { status: 'success', endedAt: ev.timestamp })
              clearNodeStatusLater(ev.triggerNodeId, 'success', 1800, isManual ? 'idle' : 'waiting')
            }
            break

          case 'job:failed':
            if (ev.triggerNodeId) {
              const isManual = manualTriggerNodeIds.has(ev.triggerNodeId)
              triggerStatuses[ev.triggerNodeId] = 'failed'
              _patchNode(ev.triggerNodeId, { status: 'failed', error: ev.error, endedAt: ev.timestamp })
              clearNodeStatusLater(ev.triggerNodeId, 'failed', 3000, isManual ? 'idle' : 'waiting')
            }
            toastError(ev.error ?? 'Workflow job failed', 'Job failed')
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
          manualTriggerNodeIds.add(trigger.triggerNodeId)
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
      manualTriggerNodeIds.add(triggerNodeId)
      triggerStatuses[triggerNodeId] = 'running'
      _patchNode(triggerNodeId, { status: 'running', startedAt: Date.now() })
      const result = await workflowsApi.executeDevSessionTrigger(sessionId, triggerNodeId, payload)
      activeExecutionId.value = result.executionId
    } catch {
      triggerStatuses[triggerNodeId] = 'failed'
      _patchNode(triggerNodeId, { status: 'failed', endedAt: Date.now() })
      clearNodeStatusLater(triggerNodeId, 'failed', 3000, 'idle')
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
  }
})
