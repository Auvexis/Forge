import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { workflowsApi } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'
import type { NodeExecutionState, WorkflowExecutionStatus } from '@/core/types/execution.types'
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
  function startStream(executionId: string) {
    stopStream()
    activeExecutionId.value = executionId
    isStreaming.value = true

    const { success, error: toastError } = useToast()

    _es = workflowsApi.createExecutionStream(executionId)

    _es.onmessage = (rawEvt: MessageEvent) => {
      try {
        const ev = JSON.parse(rawEvt.data as string) as WorkflowEvent

        switch (ev.type) {
          case 'node:start':
            if (ev.nodeId) {
              _patchNode(ev.nodeId, { status: 'running', startedAt: ev.timestamp })
            }
            break

          case 'node:success':
            if (ev.nodeId) {
              _patchNode(ev.nodeId, {
                status: 'success',
                output: ev.data,
                endedAt: ev.timestamp,
              })
            }
            break

          case 'node:failed':
            if (ev.nodeId) {
              _patchNode(ev.nodeId, {
                status: 'failed',
                error: ev.error,
                endedAt: ev.timestamp,
              })
              toastError(ev.error ?? `Node "${ev.nodeId}" failed`, 'Node execution failed')
            }
            break

          case 'workflow:success':
            workflowStatus.value = 'SUCCESS'
            isStreaming.value = false
            stopStream()
            success('Workflow completed successfully')
            break

          case 'workflow:failed':
            workflowStatus.value = 'FAILED'
            isStreaming.value = false
            stopStream()
            toastError('Workflow execution failed', 'Workflow failed')
            break

          case 'workflow:cancelled':
            workflowStatus.value = 'CANCELLED'
            // Revert every still-running node back to idle
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
            // workflow:start and any future event types — no-op
            break
        }
      } catch {
        // Silently ignore malformed SSE payloads
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
    startStream(clientExecId)

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
    patchNodeStatus,
  }
})
