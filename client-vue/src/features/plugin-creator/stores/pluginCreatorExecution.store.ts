import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import type { PluginCreatorMethodTraceEvent } from '../../../core/types/plugin-creator.types.ts'

export type PluginCreatorNodeExecutionStatus =
  | 'idle'
  | 'waiting'
  | 'running'
  | 'success'
  | 'failed'

export interface PluginCreatorNodeExecutionState {
  status: PluginCreatorNodeExecutionStatus
  output?: unknown
  error?: string
  startedAt?: string | number
  endedAt?: string | number
}

export type PluginCreatorTimelineStatus =
  | 'info'
  | 'waiting'
  | 'running'
  | 'success'
  | 'failed'

export interface PluginCreatorTimelineEvent {
  id: string
  type: PluginCreatorMethodTraceEvent['type']
  nodeId?: string
  timestamp: string
  status: PluginCreatorTimelineStatus
  label: string
  output?: unknown
  error?: string
}

export const usePluginCreatorExecutionStore = defineStore('plugin-creator-execution', () => {
  const nodeStatuses = reactive<Record<string, PluginCreatorNodeExecutionState>>({})
  const timeline = ref<PluginCreatorTimelineEvent[]>([])
  const finalOutput = ref<unknown>(null)
  const finalError = ref<string | null>(null)

  const hasExecution = computed(
    () =>
      timeline.value.length > 0 ||
      Object.keys(nodeStatuses).length > 0 ||
      finalOutput.value !== null ||
      finalError.value !== null,
  )

  function patchNodeStatus(nodeId: string, patch: Partial<PluginCreatorNodeExecutionState>) {
    const previous = nodeStatuses[nodeId]
    nodeStatuses[nodeId] = previous ? { ...previous, ...patch } : { status: 'idle', ...patch }
  }

  function setNodeOutput(nodeId: string, output: unknown) {
    patchNodeStatus(nodeId, { output })
  }

  function setNodeError(nodeId: string, error: string) {
    patchNodeStatus(nodeId, { error, status: 'failed' })
  }

  function getEdgeStatus(
    sourceNodeId: string,
    targetNodeId: string,
  ): PluginCreatorNodeExecutionStatus {
    const targetStatus = nodeStatuses[targetNodeId]?.status
    const sourceStatus = nodeStatuses[sourceNodeId]?.status

    if (targetStatus === 'failed' || sourceStatus === 'failed') return 'failed'
    if (targetStatus === 'running' || sourceStatus === 'running') return 'running'
    if (targetStatus === 'waiting' || sourceStatus === 'waiting') return 'waiting'
    if (sourceStatus === 'success') return 'success'
    return 'idle'
  }

  function appendTimeline(event: PluginCreatorTimelineEvent) {
    timeline.value.push(event)
  }

  function applyTrace(events: PluginCreatorMethodTraceEvent[]) {
    clearExecution()

    for (const event of events) {
      if (event.nodeId) {
        if (event.type === 'node:running') {
          patchNodeStatus(event.nodeId, { status: 'running', startedAt: event.timestamp })
        } else if (event.type === 'node:success') {
          patchNodeStatus(event.nodeId, {
            status: 'success',
            output: event.output,
            endedAt: event.timestamp,
          })
        } else if (event.type === 'node:failed') {
          patchNodeStatus(event.nodeId, {
            status: 'failed',
            error: event.error,
            endedAt: event.timestamp,
          })
        }
      }

      if (event.type === 'method:success') finalOutput.value = event.output
      if (event.type === 'method:failed') finalError.value = event.error ?? 'Method failed'
      appendTimeline(traceToTimelineEvent(event, timeline.value.length))
    }
  }

  function clearExecution() {
    for (const key of Object.keys(nodeStatuses)) {
      delete nodeStatuses[key]
    }
    timeline.value = []
    finalOutput.value = null
    finalError.value = null
  }

  return {
    nodeStatuses,
    timeline,
    finalOutput,
    finalError,
    hasExecution,
    patchNodeStatus,
    setNodeOutput,
    setNodeError,
    getEdgeStatus,
    appendTimeline,
    applyTrace,
    clearExecution,
  }
})

function traceToTimelineEvent(
  event: PluginCreatorMethodTraceEvent,
  index: number,
): PluginCreatorTimelineEvent {
  const status = timelineStatusFor(event.type)
  const subject = event.nodeId ?? 'method'
  return {
    id: `${event.type}:${subject}:${event.timestamp}:${index}`,
    type: event.type,
    nodeId: event.nodeId,
    timestamp: event.timestamp,
    status,
    label: `${subject} ${event.type.split(':')[1]}`,
    output: event.output,
    error: event.error,
  }
}

function timelineStatusFor(type: PluginCreatorMethodTraceEvent['type']): PluginCreatorTimelineStatus {
  if (type === 'node:success' || type === 'method:success') return 'success'
  if (type === 'node:failed' || type === 'method:failed') return 'failed'
  if (type === 'node:running') return 'running'
  return 'info'
}
