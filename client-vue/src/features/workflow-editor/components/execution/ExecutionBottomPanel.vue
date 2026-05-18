<template>
  <div class="ebp">
    <div class="ebp-topbar">
      <div class="ebp-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="ebp-tab"
          :class="{ 'ebp-tab--active': !showHistory && tab.id === activeTabId }"
          @click="showLiveTab(tab.id)"
        >
          <LucideIcon :name="tab.icon" :size="13" />
          <span>{{ tab.label }}</span>
          <small>{{ tab.events.length }}</small>
        </button>
      </div>
      <button
        class="ebp-history-btn"
        :class="{ 'ebp-history-btn--active': showHistory }"
        type="button"
        title="Execution history"
        @click="toggleHistory"
      >
        <LucideIcon name="history" :size="14" />
        <span>History</span>
      </button>
    </div>

    <div class="ebp-body">
      <div v-if="showHistory" class="ebp-history">
        <aside class="ebp-history-list">
          <button
            v-for="run in historyRuns"
            :key="run.id"
            class="ebp-history-run"
            :class="{ 'ebp-history-run--active': run.id === selectedHistoryRunId }"
            type="button"
            @click="selectedHistoryRunId = run.id"
          >
            <span class="ebp-history-run__status" :class="`ebp-history-run__status--${run.status.toLowerCase()}`" />
            <span>{{ formatTime(run.startedAt) }}</span>
            <small>{{ run.status }}</small>
          </button>
          <div v-if="historyLoading" class="ebp-history-loading">Loading...</div>
        </aside>

        <div class="ebp-history-body">
          <div v-if="historyRuns.length === 0 && !historyLoading" class="ebp-empty">
            <LucideIcon name="history" :size="18" />
            <span>No previous runs yet.</span>
          </div>
          <ExecutionEventList v-else :events="historyEvents" />
        </div>
      </div>

      <div v-else-if="activeEvents.length === 0" class="ebp-empty">
        <LucideIcon name="activity" :size="18" />
        <span>No live events yet.</span>
      </div>
      <ExecutionEventList v-else :events="activeEvents" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, TransitionGroup, watch, type PropType } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useExecutionStore } from '../../stores/execution.store'
import { useWorkflowStore } from '../../stores/workflow.store'
import { workflowsApi } from '@/core/api/workflows.api'
import type { ExecutionLog, ExecutionTimelineEvent } from '@/core/types/execution.types'

const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()
const activeTabId = ref('all')
const showHistory = ref(false)
const historyLoading = ref(false)
const historyRuns = ref<ExecutionLog[]>([])
const selectedHistoryRunId = ref<string | null>(null)

type PanelEvent = ExecutionTimelineEvent & { workflowId?: string; body?: unknown }

const tabs = computed(() => {
  const grouped = new Map<string, ExecutionTimelineEvent[]>()
  grouped.set('all', executionStore.timeline)

  for (const item of executionStore.timeline) {
    const id = item.triggerNodeId ?? item.source ?? 'workflow'
    const events = grouped.get(id) ?? []
    events.push(item)
    grouped.set(id, events)
  }

  return Array.from(grouped.entries()).map(([id, events]) => ({
    id,
    label: id === 'all' ? 'All' : id,
    icon: id === 'all' ? 'list-tree' : 'radio',
    events,
  }))
})

const activeEvents = computed(() => {
  return tabs.value.find((tab) => tab.id === activeTabId.value)?.events ?? []
})

const selectedHistoryRun = computed(() =>
  historyRuns.value.find((run) => run.id === selectedHistoryRunId.value) ?? null,
)

const historyEvents = computed<PanelEvent[]>(() =>
  selectedHistoryRun.value ? executionLogToEvents(selectedHistoryRun.value) : [],
)

watch(tabs, (next) => {
  if (!next.some((tab) => tab.id === activeTabId.value)) activeTabId.value = 'all'
})

function showLiveTab(tabId: string) {
  showHistory.value = false
  activeTabId.value = tabId
}

async function toggleHistory() {
  showHistory.value = !showHistory.value
  if (showHistory.value && historyRuns.value.length === 0) await loadHistory()
}

async function loadHistory() {
  const workflowId = workflowStore.activeWorkflow?.metadata.id
  if (!workflowId) return

  historyLoading.value = true
  try {
    historyRuns.value = await workflowsApi.getExecutions(workflowId)
    selectedHistoryRunId.value = historyRuns.value[0]?.id ?? null
  } finally {
    historyLoading.value = false
  }
}

function executionLogToEvents(run: ExecutionLog): PanelEvent[] {
  const events: PanelEvent[] = [
    {
      id: `${run.id}:workflow`,
      type: run.status === 'SUCCESS' ? 'workflow:success' : run.status === 'RUNNING' ? 'workflow:start' : 'workflow:failed',
      executionId: run.id,
      workflowId: run.workflowId,
      timestamp: run.startedAt,
      status: run.status === 'RUNNING' ? 'running' : run.status === 'SUCCESS' ? 'success' : 'failed',
      label: `Workflow ${run.status.toLowerCase()}`,
      body: run.context.trigger,
      error: run.status === 'FAILED' ? 'Workflow failed' : undefined,
    },
  ]

  for (const [nodeId, step] of Object.entries(run.context.steps ?? {})) {
    events.push({
      id: `${run.id}:${nodeId}`,
      type: step.status === 'SUCCESS' ? 'node:success' : step.status === 'RUNNING' ? 'node:start' : 'node:failed',
      executionId: run.id,
      workflowId: run.workflowId,
      nodeId,
      timestamp: step.endedAt ?? step.startedAt ?? run.endedAt ?? run.startedAt,
      status: step.status === 'RUNNING' ? 'running' : step.status === 'SUCCESS' ? 'success' : 'failed',
      label: `${nodeId} ${step.status.toLowerCase()}`,
      body: step.output,
      error: step.error,
    })
  }

  return events
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

function eventBody(item: PanelEvent): unknown {
  return item.body ?? item.payload
}

function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

const ExecutionEventList = defineComponent({
  name: 'ExecutionEventList',
  props: {
    events: {
      type: Array as PropType<PanelEvent[]>,
      required: true,
    },
  },
  setup(props) {
    const expandedEventIds = ref(new Set<string>())

    function toggleEventDetails(id: string) {
      const next = new Set(expandedEventIds.value)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      expandedEventIds.value = next
    }

    return () =>
      h(
        TransitionGroup,
        { name: 'ebp-event-list', tag: 'div', class: 'ebp-timeline' },
        {
          default: () =>
            props.events.map((item) =>
              h('article', { key: item.id, class: ['ebp-event', `ebp-event--${item.status}`] }, [
                h(
                  'button',
                  {
                    class: 'ebp-event-row',
                    type: 'button',
                    onClick: () => toggleEventDetails(item.id),
                  },
                  [
                    h(LucideIcon, {
                      name: 'chevron-right',
                      size: 12,
                      class: ['ebp-chevron', { 'ebp-chevron--open': expandedEventIds.value.has(item.id) }],
                    }),
                    h('span', { class: 'ebp-dot' }),
                    h('div', { class: 'ebp-copy' }, [
                      h('span', item.label),
                      h('small', formatTime(item.timestamp)),
                    ]),
                    item.nodeId ? h('code', item.nodeId) : null,
                    item.error ? h('span', { class: 'ebp-error' }, item.error) : null,
                  ],
                ),
                expandedEventIds.value.has(item.id)
                  ? h('div', { class: 'ebp-event-detail' }, [
                      item.error
                        ? h('pre', item.error)
                        : eventBody(item)
                          ? h('pre', formatJson(eventBody(item)))
                          : h('span', 'No body data for this step.'),
                    ])
                  : null,
              ]),
            ),
        },
      )
  },
})
</script>

<style scoped>
.ebp {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--sailor-bg-surface);
}

.ebp-topbar {
  display: flex;
  min-height: 36px;
  border-bottom: 1px solid var(--sailor-border);
  background: var(--sailor-bg-base);
}

.ebp-tabs {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 1px;
  overflow-x: auto;
}

.ebp-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--sailor-space-2);
  min-width: 120px;
  padding: 0 var(--sailor-space-3);
  border: 0;
  border-right: 1px solid var(--sailor-border);
  color: var(--sailor-text-muted);
  background: transparent;
  cursor: pointer;
}

.ebp-tab--active {
  color: var(--sailor-text-primary);
  background: var(--sailor-bg-surface);
}

.ebp-history-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--sailor-space-2);
  min-width: 92px;
  padding: 0 var(--sailor-space-3);
  border: 0;
  border-left: 1px solid var(--sailor-border);
  color: var(--sailor-text-muted);
  background: transparent;
  cursor: pointer;
}

.ebp-history-btn--active,
.ebp-history-btn:hover {
  color: var(--sailor-text-primary);
  background: var(--sailor-bg-surface);
}

.ebp-tab span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-size: var(--sailor-text-xs);
}

.ebp-tab small {
  font-family: var(--sailor-font-mono);
  font-size: 10px;
}

.ebp-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ebp-history {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.ebp-history-list {
  min-height: 0;
  overflow: auto;
  border-right: 1px solid var(--sailor-border);
  background: var(--sailor-bg-base);
}

.ebp-history-run {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sailor-space-2);
  width: 100%;
  min-height: 34px;
  padding: 0 var(--sailor-space-3);
  border: 0;
  border-bottom: 1px solid var(--sailor-border-muted);
  color: var(--sailor-text-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.ebp-history-run--active,
.ebp-history-run:hover {
  color: var(--sailor-text-primary);
  background: var(--sailor-bg-surface);
}

.ebp-history-run span:not(.ebp-history-run__status) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--sailor-text-xs);
}

.ebp-history-run small,
.ebp-history-loading {
  color: var(--sailor-text-muted);
  font-family: var(--sailor-font-mono);
  font-size: 10px;
}

.ebp-history-run__status {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--sailor-text-muted);
}

.ebp-history-run__status--success {
  background: var(--sailor-green-400);
}

.ebp-history-run__status--failed {
  background: var(--sailor-red-400);
}

.ebp-history-run__status--running {
  background: var(--sailor-amber-400);
}

.ebp-history-loading {
  padding: var(--sailor-space-3);
}

.ebp-history-body {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.ebp-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-2);
  height: 100%;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-sm);
}

.ebp-timeline {
  display: flex;
  flex-direction: column;
}

.ebp-event {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--sailor-border-muted);
}

.ebp-event-row {
  display: grid;
  grid-template-columns: 12px 10px minmax(0, 1fr) minmax(120px, auto) minmax(0, auto);
  align-items: center;
  gap: var(--sailor-space-2);
  min-height: 30px;
  padding: 0 var(--sailor-space-3);
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.ebp-event-row:hover {
  background: var(--sailor-bg-base);
}

.ebp-chevron {
  color: var(--sailor-text-muted);
  transition: transform 160ms ease;
}

.ebp-chevron--open {
  transform: rotate(90deg);
}

.ebp-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--sailor-text-muted);
}

.ebp-event--running .ebp-dot {
  background: var(--sailor-amber-400);
}

.ebp-event--success .ebp-dot {
  background: var(--sailor-green-400);
}

.ebp-event--failed .ebp-dot {
  background: var(--sailor-red-400);
}

.ebp-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ebp-copy span,
.ebp-error {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ebp-copy span {
  font-size: var(--sailor-text-xs);
  color: var(--sailor-text-secondary);
}

.ebp-copy small,
.ebp-event code {
  font-family: var(--sailor-font-mono);
  font-size: 10px;
  color: var(--sailor-text-muted);
}

.ebp-error {
  max-width: 320px;
  color: var(--sailor-red-400);
  font-size: 10px;
}

.ebp-event-detail {
  padding: var(--sailor-space-3) var(--sailor-space-4) var(--sailor-space-3) 44px;
  border-top: 1px solid var(--sailor-border-muted);
  background: var(--sailor-bg-base);
}

.ebp-event-detail pre {
  max-height: 220px;
  margin: 0;
  overflow: auto;
  color: var(--sailor-text-secondary);
  font-family: var(--sailor-font-mono);
  font-size: 11px;
  line-height: 1.5;
}

.ebp-event-detail span {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.ebp-event-list-enter-active,
.ebp-event-list-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease,
    background-color 500ms ease;
}

.ebp-event-list-enter-from,
.ebp-event-list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.ebp-event-list-enter-active {
  background: color-mix(in srgb, var(--sailor-green-400) 12%, transparent);
}
</style>
