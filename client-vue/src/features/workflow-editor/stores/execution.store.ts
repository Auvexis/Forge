import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { workflowsApi } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'
import type {
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

  /** Last known overall workflow execution outcome */
  const workflowStatus = ref<WorkflowExecutionStatus | null>(null)
  const timeline = ref<ExecutionTimelineEvent[]>([])

  // Internal EventSource — intentionally non-reactive (DOM object)
  let _es: EventSource | null = null

  // ── Derived ──────────────────────────────────────────────────────────────

  const hasActiveExecution = computed(() => isStreaming.value || isExecuting.value)

  // ── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Merges `patch` into the state for `nodeId`.
   * In-place mutation on the reactive record triggers per-key tracking.
   */
  function _patchNode(nodeId: string, patch: Partial<NodeExecutionState>) {
    const prev = nodeStatuses[nodeId]
    nodeStatuses[nodeId] = prev ? { ...prev, ...patch } : { status: 'idle' as const, ...patch }
  }

  function timelineStatusFor(type: string): ExecutionTimelineEvent['status'] {
    if (type === 'node:success' || type === 'workflow:success' || type === 'trigger:data') return 'success'
    if (type === 'node:failed' || type === 'workflow:failed') return 'failed'
    if (type === 'node:retry') return 'retrying'
    if (type === 'workflow:cancelled') return 'cancelled'
    if (type === 'node:start' || type === 'workflow:start' || type === 'temporary-form:created') {
      return 'running'
    }
    return 'info'
  }

  function timelineLabelFor(ev: WorkflowEvent): string {
    if (ev.type === 'node:start') return `${ev.nodeId} started`
    if (ev.type === 'node:retry') return `${ev.nodeId} retrying`
    if (ev.type === 'node:success') return `${ev.nodeId} succeeded`
    if (ev.type === 'node:failed') return `${ev.nodeId} failed`
    if (ev.type === 'trigger:data') return 'Trigger payload received'
    if (ev.type === 'temporary-form:created') return `${ev.nodeId} waiting for form`
    return ev.type.replace(':', ' ')
  }

  function recordTimelineEvent(ev: WorkflowEvent) {
    timeline.value.push({
      id: `${ev.type}:${ev.nodeId ?? 'workflow'}:${ev.timestamp}:${timeline.value.length}`,
      type: ev.type,
      nodeId: ev.nodeId,
      timestamp: ev.timestamp,
      status: timelineStatusFor(ev.type),
      label: timelineLabelFor(ev),
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
    workflowStatus.value = null
    timeline.value = []
  }

  /** Marks the trigger node as 'running' (e.g. waiting for a form submission). */
  function setTriggerRunning() {
    _patchNode('trigger', { status: 'running', startedAt: Date.now() })
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
  function startStream(executionId: string): Promise<void> {
    return new Promise((resolve) => {
      stopStream()
      activeExecutionId.value = executionId
      isStreaming.value = true

      const { success, error: toastError } = useToast()

      _es = workflowsApi.createExecutionStream(executionId)

      _es.onopen = () => {
        resolve()
      }

      _es.onmessage = (rawEvt: MessageEvent) => {
        try {
          const ev = JSON.parse(rawEvt.data as string) as WorkflowEvent
          recordTimelineEvent(ev)

          switch (ev.type) {
            case 'trigger:data':
              _patchNode('trigger', {
                status: 'success',
                output: ev.data,
                endedAt: ev.timestamp,
              })
              break

            case 'node:start':
              if (ev.nodeId) {
                if (!nodeStatuses['trigger'] || nodeStatuses['trigger'].status === 'idle' || nodeStatuses['trigger'].status === 'running') {
                  _patchNode('trigger', { status: 'success', endedAt: ev.timestamp })
                }
                _patchNode(ev.nodeId, { status: 'running', startedAt: ev.timestamp })
              }
              break

            case 'node:retry':
              if (ev.nodeId) {
                const data = ev.data as { attempt?: number; delayMs?: number } | undefined
                const previous = nodeStatuses[ev.nodeId]?.retries ?? []
                _patchNode(ev.nodeId, {
                  status: 'running',
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
              if (nodeStatuses['trigger']?.status === 'running') {
                _patchNode('trigger', { status: 'success', endedAt: ev.timestamp })
              }
              isStreaming.value = false
              stopStream()
              success('Workflow completed successfully')
              break

            case 'workflow:failed':
              workflowStatus.value = 'FAILED'
              if (nodeStatuses['trigger']?.status === 'running') {
                _patchNode('trigger', { status: 'success', endedAt: ev.timestamp })
              }
              isStreaming.value = false
              stopStream()
              toastError('Workflow execution failed', 'Workflow failed')
              break

            case 'workflow:cancelled':
              workflowStatus.value = 'CANCELLED'
              for (const nid of Object.keys(nodeStatuses)) {
                if (nodeStatuses[nid]?.status === 'running') {
                  nodeStatuses[nid] = { ...nodeStatuses[nid]!, status: 'idle' }
                }
              }
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
        resolve() // Ensure we don't hang if it fails immediately
        if (isStreaming.value) {
          isStreaming.value = false
          stopStream()
          useToast().error('Execution stream disconnected')
        }
      }
    })
  }

  /**
   * Kicks off a workflow execution:
   * 1. Resets previous node statuses so the canvas is clean
   * 2. Opens the SSE stream with a client-generated ID *before* the POST,
   *    preventing any early `node:start` events from being missed
   * 3. POSTs to the execute endpoint
   * 4. If the server returns a different execution ID, reconnects the stream
   */
  async function execute(workflowId: string, payload: Record<string, unknown> = {}) {
    const { error: toastError } = useToast()

    resetNodeStatuses()

    const clientExecId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    await startStream(clientExecId)
    setTriggerRunning()   // shimmer laranja no trigger enquanto a execução inicia

    isExecuting.value = true
    try {
      const result = await workflowsApi.execute(workflowId, payload, clientExecId)

      // Reconnect to the server-assigned ID if it differs from our client ID
      if (result.executionId && result.executionId !== clientExecId) {
        startStream(result.executionId)
      }
    } catch {
      isStreaming.value = false
      stopStream()
      toastError('Failed to start workflow execution')
      throw new Error('Execution failed')
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
    await startStream(clientExecId)

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
    if (!activeExecutionId.value) return
    const { error: toastError } = useToast()
    try {
      await workflowsApi.cancelExecution(activeExecutionId.value)
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
    workflowStatus,
    hasActiveExecution,
    execute,
    executeFormSubmission,
    cancel,
    startStream,
    stopStream,
    resetNodeStatuses,
    setTriggerRunning,
    patchNodeStatus,
  }
})
