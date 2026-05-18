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

    <div class="ebp-body" :class="{ 'ebp-body--history': showHistory }">
      <aside v-if="showHistory" class="ebp-history-list">
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

      <div class="ebp-main">
        <div v-if="visibleEvents.length === 0" class="ebp-empty">
          <LucideIcon :name="showHistory ? 'history' : 'activity'" :size="18" />
          <span>{{ emptyMessage }}</span>
        </div>

        <TransitionGroup v-else name="ebp-event-list" tag="div" class="ebp-timeline">
          <article
            v-for="item in visibleEvents"
            :key="item.id"
            class="ebp-event"
            :class="`ebp-event--${item.status}`"
          >
            <button class="ebp-event-row" type="button" @click="toggleEventDetails(item.id)">
              <LucideIcon
                name="chevron-right"
                :size="13"
                class="ebp-chevron"
                :class="{ 'ebp-chevron--open': expandedEventIds.has(item.id) }"
              />
              <span class="ebp-dot" />
              <div class="ebp-event-main">
                <span class="ebp-event-label">{{ item.label }}</span>
                <small class="ebp-event-time">{{ formatTime(item.timestamp) }}</small>
              </div>
              <code v-if="item.nodeId" class="ebp-event-node">{{ item.nodeId }}</code>
              <span v-else class="ebp-event-node ebp-event-node--empty">workflow</span>
              <span class="ebp-event-status">{{ item.status }}</span>
              <span v-if="item.error" class="ebp-error">{{ item.error }}</span>
            </button>

            <Transition name="ebp-event-detail-slide">
              <div v-if="expandedEventIds.has(item.id)" class="ebp-event-detail">
                <div class="ebp-event-detail__header">
                  <span>{{ item.error ? 'Error' : 'Body' }}</span>
                  <small>{{ item.nodeId || item.source || 'workflow' }}</small>
                </div>
                <pre v-if="item.error">{{ item.error }}</pre>
                <pre v-else-if="eventBody(item)">{{ formatJson(eventBody(item)) }}</pre>
                <span v-else>No body data for this step.</span>
              </div>
            </Transition>
          </article>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
const expandedEventIds = ref(new Set<string>())

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

const visibleEvents = computed<PanelEvent[]>(() =>
  showHistory.value ? historyEvents.value : activeEvents.value,
)

const emptyMessage = computed(() => {
  if (showHistory.value && historyLoading.value) return 'Loading history...'
  return showHistory.value ? 'No previous runs yet.' : 'No live events yet.'
})

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

function toggleEventDetails(id: string) {
  const next = new Set(expandedEventIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedEventIds.value = next
}

function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}
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

.ebp-body--history {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
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

.ebp-main {
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
  padding: var(--sailor-space-2);
  gap: var(--sailor-space-1);
}

.ebp-event {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--sailor-border-muted);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-surface);
}

.ebp-event-row {
  display: grid;
  grid-template-columns: 16px 10px minmax(160px, 1fr) minmax(110px, 0.5fr) 76px minmax(0, 0.9fr);
  align-items: center;
  gap: var(--sailor-space-2);
  min-height: 42px;
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

.ebp-event-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.ebp-event-label,
.ebp-event-node,
.ebp-event-status,
.ebp-error {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ebp-event-label {
  font-size: var(--sailor-text-xs);
  font-weight: 600;
  color: var(--sailor-text-primary);
}

.ebp-event-time,
.ebp-event-node {
  font-family: var(--sailor-font-mono);
  font-size: 10px;
  color: var(--sailor-text-muted);
}

.ebp-event-node {
  justify-self: start;
  max-width: 100%;
  padding: 2px 6px;
  border: 1px solid var(--sailor-border-muted);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-base);
}

.ebp-event-node--empty {
  font-family: var(--sailor-font-sans);
  font-style: italic;
}

.ebp-event-status {
  justify-self: start;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--sailor-bg-muted);
  color: var(--sailor-text-secondary);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.ebp-event--running .ebp-event-status {
  background: color-mix(in srgb, var(--sailor-amber-400) 14%, transparent);
  color: var(--sailor-amber-400);
}

.ebp-event--success .ebp-event-status {
  background: color-mix(in srgb, var(--sailor-green-400) 14%, transparent);
  color: var(--sailor-green-400);
}

.ebp-event--failed .ebp-event-status {
  background: color-mix(in srgb, var(--sailor-red-400) 14%, transparent);
  color: var(--sailor-red-400);
}

.ebp-error {
  max-width: 100%;
  color: var(--sailor-red-400);
  font-size: 11px;
}

.ebp-event-detail {
  margin: 0 var(--sailor-space-3) var(--sailor-space-3) 38px;
  padding: var(--sailor-space-3);
  border-top: 1px solid var(--sailor-border-muted);
  border-left: 2px solid var(--sailor-border);
  border-radius: 0 0 var(--sailor-radius-sm) var(--sailor-radius-sm);
  background: var(--sailor-bg-base);
}

.ebp-event-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-2);
  margin-bottom: var(--sailor-space-2);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  font-weight: 700;
}

.ebp-event-detail__header small {
  min-width: 0;
  overflow: hidden;
  color: var(--sailor-text-muted);
  font-family: var(--sailor-font-mono);
  font-size: 10px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.ebp-event-detail-slide-enter-active,
.ebp-event-detail-slide-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.ebp-event-detail-slide-enter-from,
.ebp-event-detail-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 900px) {
  .ebp-event-row {
    grid-template-columns: 16px 10px minmax(0, 1fr) 68px;
  }

  .ebp-event-node,
  .ebp-error {
    display: none;
  }
}
</style>
