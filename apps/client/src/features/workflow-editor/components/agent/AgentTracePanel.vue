<template>
  <section v-if="agentEvents.length" class="agent-trace-panel">
    <div class="agent-trace-panel__header">
      <p>Agent Trace</p>
      <span>{{ agentEvents.length }} events</span>
    </div>

    <div class="agent-trace-panel__groups">
      <article
        v-for="trace in groupedTraces"
        :key="trace.id"
        class="agent-trace-panel__event"
        :class="`agent-trace-panel__event--${trace.status}`"
      >
        <button
          class="agent-trace-panel__summary"
          type="button"
          :aria-label="`Toggle agent trace payload for ${trace.label}`"
          @click="togglePayload(trace.id)"
        >
          <span class="agent-trace-panel__kind">{{ trace.group }}</span>
          <span class="agent-trace-panel__label">{{ trace.label }}</span>
          <span v-if="trace.status === 'failed'" class="agent-trace-panel__retry">retry/error</span>
        </button>

        <pre
          v-if="!isPayloadLarge(trace.payload) || !collapsedPayloads.has(trace.id)"
          class="agent-trace-panel__payload"
        >{{ payloadPreview(trace.payload) }}</pre>
        <button
          v-else
          class="agent-trace-panel__collapsed"
          type="button"
          :aria-label="`Expand large payload for ${trace.label}`"
          @click="togglePayload(trace.id)"
        >
          Large payload collapsed
        </button>

        <AgentApprovalPanel
          v-if="trace.group === 'approval' && approvalId(trace.payload)"
          :approval-id="approvalId(trace.payload)"
          :execution-id="executionId(trace)"
          :tool-name="approvalToolName(trace.payload)"
          :side-effect="approvalSideEffect(trace.payload)"
          :args="approvalArgs(trace.payload)"
          @refresh-trace="emit('refreshTrace')"
        />
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ExecutionTimelineEvent } from '@/core/types/execution.types'
import AgentApprovalPanel from './AgentApprovalPanel.vue'

type AgentTraceGroup = 'model' | 'tool' | 'memory' | 'approval' | 'error' | 'agent'

interface AgentTrace {
  id: string
  group: AgentTraceGroup
  label: string
  status: ExecutionTimelineEvent['status']
  executionId?: string
  payload: unknown
}

const MAX_AGENT_TRACE_PREVIEW_CHARS = 1200
const SECRET_FIELD_PATTERN = /authorization|password|secret|token|apiKey/i

const props = defineProps<{
  timeline: ExecutionTimelineEvent[]
}>()

const emit = defineEmits<{
  refreshTrace: []
}>()

const collapsedPayloads = ref(new Set<string>())

const agentEvents = computed(() => props.timeline.filter((event) => event.type.startsWith('agent:')))
const groupedTraces = computed(() => groupAgentEvents(agentEvents.value))

watch(
  groupedTraces,
  (traces) => {
    collapsedPayloads.value = new Set(
      traces.filter((trace) => isPayloadLarge(trace.payload)).map((trace) => trace.id),
    )
  },
  { immediate: true },
)

function groupAgentEvents(events: ExecutionTimelineEvent[]): AgentTrace[] {
  return events.map((event) => ({
    id: event.id,
    group: groupForEvent(event.type),
    label: labelForTrace(event),
    status: event.status,
    executionId: event.executionId,
    payload: redactSecretLikeFields(event.payload ?? event.error ?? {}),
  }))
}

function groupForEvent(type: ExecutionTimelineEvent['type']): AgentTraceGroup {
  if (type.includes(':model-')) return 'model'
  if (type.includes(':tool-')) return 'tool'
  if (type.includes(':memory-')) return 'memory'
  if (type.includes(':approval-')) return 'approval'
  if (type === 'agent:error') return 'error'
  return 'agent'
}

function labelForTrace(event: ExecutionTimelineEvent) {
  if (event.type === 'agent:tool-end' && event.status === 'failed') return 'Tool failure'
  return event.label
}

function redactSecretLikeFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecretLikeFields)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SECRET_FIELD_PATTERN.test(key) ? '[REDACTED]' : redactSecretLikeFields(item),
    ]),
  )
}

function payloadPreview(payload: unknown) {
  const serialized = JSON.stringify(payload, null, 2)
  if (serialized.length <= MAX_AGENT_TRACE_PREVIEW_CHARS) return serialized
  return `${serialized.slice(0, MAX_AGENT_TRACE_PREVIEW_CHARS)}...`
}

function isPayloadLarge(payload: unknown) {
  return JSON.stringify(payload ?? '').length > MAX_AGENT_TRACE_PREVIEW_CHARS
}

function togglePayload(traceId: string) {
  const next = new Set(collapsedPayloads.value)
  if (next.has(traceId)) next.delete(traceId)
  else next.add(traceId)
  collapsedPayloads.value = next
}

function approvalId(payload: unknown) {
  return approvalPayloadValue(payload, 'approvalId')
}

function executionId(trace: AgentTrace) {
  return trace.executionId ?? approvalPayloadValue(trace.payload, 'executionId')
}

function approvalToolName(payload: unknown) {
  return approvalPayloadValue(payload, 'toolName') || approvalPayloadValue(payload, 'tool') || 'Agent tool'
}

function approvalSideEffect(payload: unknown) {
  return approvalPayloadValue(payload, 'sideEffect') || 'write'
}

function approvalArgs(payload: unknown) {
  if (!payload || typeof payload !== 'object') return {}
  return (payload as Record<string, unknown>).args ?? (payload as Record<string, unknown>).input ?? {}
}

function approvalPayloadValue(payload: unknown, key: string) {
  if (!payload || typeof payload !== 'object') return ''
  const value = (payload as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}
</script>

<style scoped>
.agent-trace-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-3) var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border);
  background: var(--sailor-bg-base);
}

.agent-trace-panel__header,
.agent-trace-panel__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-2);
}

.agent-trace-panel__header p {
  margin: 0;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.agent-trace-panel__header span,
.agent-trace-panel__kind,
.agent-trace-panel__retry {
  color: var(--sailor-text-muted);
  font-size: 10px;
  font-family: var(--sailor-font-mono);
}

.agent-trace-panel__groups {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.agent-trace-panel__event {
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-overlay);
}

.agent-trace-panel__event--failed {
  border-color: var(--sailor-red-400);
}

.agent-trace-panel__summary,
.agent-trace-panel__collapsed {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--sailor-text-secondary);
  cursor: pointer;
  text-align: left;
}

.agent-trace-panel__summary {
  padding: var(--sailor-space-2);
}

.agent-trace-panel__label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--sailor-text-xs);
}

.agent-trace-panel__payload {
  max-height: 160px;
  margin: 0;
  overflow: auto;
  padding: var(--sailor-space-2);
  border-top: 1px solid var(--sailor-border);
  color: var(--sailor-text-secondary);
  font-family: var(--sailor-font-mono);
  font-size: 10px;
  white-space: pre-wrap;
  word-break: break-word;
}

.agent-trace-panel__collapsed {
  padding: var(--sailor-space-2);
  border-top: 1px solid var(--sailor-border);
  font-size: var(--sailor-text-xs);
}

.agent-trace-panel__retry {
  color: var(--sailor-red-400);
}
</style>
