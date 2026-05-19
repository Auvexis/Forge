<template>
  <BaseModal
    :is-open="isAutomationMonitorOpen"
    max-width="1320px"
    height="86vh"
    @close="isAutomationMonitorOpen = false"
  >
    <section class="gam-shell">
      <aside class="gam-sidebar">
        <header class="gam-header">
          <div>
            <span class="gam-eyebrow">Monitoring</span>
            <strong>Automations</strong>
          </div>
          <button class="gam-icon-btn" type="button" title="Close" @click="isAutomationMonitorOpen = false">
            <LucideIcon name="x" :size="16" />
          </button>
        </header>

        <div class="gam-profile">
          <button class="gam-profile-btn" type="button" @click="isProfileMenuOpen = !isProfileMenuOpen">
            <LucideIcon name="user-round" :size="15" />
            <span>{{ selectedProfileLabel }}</span>
            <LucideIcon name="chevron-down" :size="14" />
          </button>
          <div v-if="isProfileMenuOpen" class="gam-profile-menu">
            <button
              v-for="profile in profileOptions"
              :key="profile.id ?? 'global'"
              type="button"
              :class="{ 'gam-profile-menu__item--active': profile.id === selectedProfileId }"
              class="gam-profile-menu__item"
              @click="selectProfile(profile.id)"
            >
              <span>{{ profile.label }}</span>
              <small>{{ profile.count }}</small>
            </button>
          </div>
        </div>

        <div class="gam-sidebar-metrics" aria-label="Automation runtime summary">
          <div>
            <span>Running</span>
            <strong>{{ runningCount }}</strong>
          </div>
          <div>
            <span>Failed</span>
            <strong>{{ failedCount }}</strong>
          </div>
          <div>
            <span>Published</span>
            <strong>{{ filteredWorkflows.length }}</strong>
          </div>
        </div>

        <div class="gam-tools">
          <button class="gam-tool-btn" type="button" :disabled="loading" @click="refreshLiveData">
            <LucideIcon name="refresh-cw" :size="14" :class="{ 'gam-spin': loading }" />
            <span>Refresh</span>
          </button>
        </div>

        <div class="gam-workflow-list">
          <button
            v-for="workflow in filteredWorkflows"
            :key="workflowKey(workflow)"
            class="gam-workflow"
            :class="{ 'gam-workflow--active': workflowKey(workflow) === selectedWorkflowKey }"
            type="button"
            @click="selectWorkflow(workflow)"
          >
            <span class="gam-status-dot" :class="statusClass(workflow.lastExecution?.status)" />
            <span class="gam-workflow__copy">
              <strong>{{ workflow.name }}</strong>
              <small>{{ workflow.profileName ?? workflow.profileId ?? 'Global' }}</small>
            </span>
            <code>{{ triggerLabel(workflow.triggerType) }}</code>
          </button>
        </div>
      </aside>

      <main class="gam-main">
        <header class="gam-main-header">
          <div>
            <span class="gam-eyebrow">Realtime workflow view</span>
            <h2>{{ selectedWorkflow?.name ?? 'Select a workflow' }}</h2>
          </div>
          <div v-if="selectedWorkflow" class="gam-main-meta">
            <span>{{ selectedWorkflow.profileName ?? selectedWorkflow.profileId ?? 'Global' }}</span>
            <span>{{ triggerLabel(selectedWorkflow.triggerType) }}</span>
            <span>{{ selectedWorkflow.lastExecution ? execLabel(selectedWorkflow.lastExecution.status) : 'No runs' }}</span>
          </div>
        </header>

        <div v-if="!selectedWorkflow" class="gam-empty">
          <LucideIcon name="activity" :size="28" />
          <span>No published automations for this profile.</span>
        </div>

        <template v-else>
          <div class="gam-tabs">
            <button
              v-for="tab in triggerTabs"
              :key="tab.id"
              class="gam-tab"
              :class="{ 'gam-tab--active': tab.id === activeTriggerTabId }"
              type="button"
              @click="activeTriggerTabId = tab.id"
            >
              <LucideIcon :name="tab.id === 'all' ? 'list-tree' : 'radio'" :size="13" />
              <span>{{ tab.label }}</span>
              <small>{{ tab.events.length }}</small>
            </button>
          </div>

          <div class="gam-execution-body">
            <div v-if="activeTriggerEvents.length === 0" class="gam-empty">
              <LucideIcon name="clock" :size="20" />
              <span>No execution events yet.</span>
            </div>

            <div v-else class="gam-timeline">
              <article
                v-for="event in activeTriggerEvents"
                :key="event.id"
                class="gam-event"
                :class="`gam-event--${event.status}`"
              >
                <button class="gam-event-row" type="button" @click="toggleEventDetails(event.id)">
                  <LucideIcon
                    name="chevron-right"
                    :size="13"
                    class="gam-event__chevron"
                    :class="{ 'gam-event__chevron--open': expandedEventIds.has(event.id) }"
                  />
                  <span class="gam-event__dot" />
                  <div class="gam-event__copy">
                    <strong>{{ event.label }}</strong>
                    <small>{{ formatTime(event.timestamp) }}</small>
                  </div>
                  <code v-if="event.nodeId">{{ event.nodeId }}</code>
                  <span v-if="event.error" class="gam-event__error">{{ event.error }}</span>
                </button>
                <div v-if="expandedEventIds.has(event.id)" class="gam-event-detail">
                  <pre v-if="event.error">{{ event.error }}</pre>
                  <pre v-else-if="event.body">{{ formatJson(event.body) }}</pre>
                  <span v-else>No body data for this step.</span>
                </div>
              </article>
            </div>
          </div>
        </template>
      </main>
    </section>
  </BaseModal>
</template>

<script lang="ts">
import { ref } from 'vue'

export const isAutomationMonitorOpen = ref(false)

export function toggleAutomationMonitor() {
  isAutomationMonitorOpen.value = !isAutomationMonitorOpen.value
}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { workflowsApi, type ProductionWorkflowStatus } from '@/core/api/workflows.api'
import type { ExecutionLog } from '@/core/types/execution.types'
import { useToast } from '@/shared/composables/useToast'
import { useProfileStore } from '@/shared/stores/profile.store'

interface RuntimeEvent {
  id: string
  triggerId: string
  label: string
  nodeId?: string
  status: 'running' | 'success' | 'failed'
  timestamp: number
  body?: unknown
  error?: string
}

const toast = useToast()
const profileStore = useProfileStore()
const loading = ref(false)
const workflows = ref<ProductionWorkflowStatus[]>([])
const selectedProfileId = ref<string | null>(null)
const selectedWorkflowKey = ref<string | null>(null)
const selectedExecutions = ref<ExecutionLog[]>([])
const activeTriggerTabId = ref('all')
const isProfileMenuOpen = ref(false)
const expandedEventIds = ref(new Set<string>())

const profileNameById = computed(() =>
  Object.fromEntries(profileStore.profiles.map((profile) => [profile.id, profile.name])),
)

const enrichedWorkflows = computed(() =>
  workflows.value.map((workflow) => ({
    ...workflow,
    profileName: workflow.profileName ?? profileNameById.value[workflow.profileId ?? ''],
  })),
)

const filteredWorkflows = computed(() => {
  if (!selectedProfileId.value) return enrichedWorkflows.value
  return enrichedWorkflows.value.filter((workflow) => workflow.profileId === selectedProfileId.value)
})

const selectedWorkflow = computed(() =>
  filteredWorkflows.value.find((workflow) => workflowKey(workflow) === selectedWorkflowKey.value) ?? null,
)

const selectedProfileLabel = computed(() => {
  if (!selectedProfileId.value) return 'Global'
  return profileNameById.value[selectedProfileId.value] ?? selectedProfileId.value
})

const profileOptions = computed(() => {
  const counts = new Map<string | null, number>()
  counts.set(null, workflows.value.length)
  for (const workflow of workflows.value) {
    const key = workflow.profileId ?? null
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [
    { id: null, label: 'Global', count: counts.get(null) ?? 0 },
    ...profileStore.sortedProfiles.map((profile) => ({
      id: profile.id,
      label: profile.name,
      count: counts.get(profile.id) ?? 0,
    })),
  ]
})

const runningCount = computed(
  () => filteredWorkflows.value.filter((workflow) => workflow.lastExecution?.status === 'RUNNING').length,
)

const failedCount = computed(
  () =>
    filteredWorkflows.value.filter((workflow) =>
      ['ERROR', 'FAILED'].includes(workflow.lastExecution?.status ?? ''),
    ).length,
)

const timelineEvents = computed<RuntimeEvent[]>(() =>
  selectedExecutions.value.flatMap((execution) => executionToEvents(execution)),
)

const triggerTabs = computed(() => {
  const grouped = new Map<string, RuntimeEvent[]>()
  grouped.set('all', timelineEvents.value)
  for (const event of timelineEvents.value) {
    const events = grouped.get(event.triggerId) ?? []
    events.push(event)
    grouped.set(event.triggerId, events)
  }

  return Array.from(grouped.entries()).map(([id, events]) => ({
    id,
    label: id === 'all' ? 'All' : id,
    events,
  }))
})

const activeTriggerEvents = computed(
  () => triggerTabs.value.find((tab) => tab.id === activeTriggerTabId.value)?.events ?? [],
)

let pollInterval: ReturnType<typeof setInterval> | null = null

function workflowKey(workflow: ProductionWorkflowStatus): string {
  return `${workflow.profileId ?? 'global'}:${workflow.id}`
}

function selectProfile(profileId: string | null) {
  selectedProfileId.value = profileId
  isProfileMenuOpen.value = false
  ensureSelectedWorkflow()
}

function selectWorkflow(workflow: ProductionWorkflowStatus) {
  selectedWorkflowKey.value = workflowKey(workflow)
  activeTriggerTabId.value = 'all'
  expandedEventIds.value = new Set()
  void loadSelectedWorkflowExecutions()
}

function ensureSelectedWorkflow() {
  if (filteredWorkflows.value.some((workflow) => workflowKey(workflow) === selectedWorkflowKey.value)) return
  selectedWorkflowKey.value = filteredWorkflows.value[0] ? workflowKey(filteredWorkflows.value[0]) : null
  activeTriggerTabId.value = 'all'
  void loadSelectedWorkflowExecutions()
}

async function refreshLiveData() {
  if (!isAutomationMonitorOpen.value) return
  loading.value = true
  try {
    workflows.value = await workflowsApi.getGlobalProductionStatus()
    ensureSelectedWorkflow()
    await loadSelectedWorkflowExecutions()
  } catch (err: any) {
    toast.error(err?.message ?? 'Failed to load automation monitor')
  } finally {
    loading.value = false
  }
}

async function loadSelectedWorkflowExecutions() {
  if (!selectedWorkflow.value) {
    selectedExecutions.value = []
    return
  }

  selectedExecutions.value = await workflowsApi.getExecutions(
    selectedWorkflow.value.id,
    selectedWorkflow.value.profileId,
  )
}

function executionToEvents(execution: ExecutionLog): RuntimeEvent[] {
  const context = execution.context as {
    trigger?: { triggerNodeId?: string; source?: string }
    steps?: Record<string, { status?: string; output?: unknown; error?: unknown }>
  }
  const triggerId = context.trigger?.triggerNodeId ?? context.trigger?.source ?? 'workflow'
  const events: RuntimeEvent[] = [
    {
      id: `${execution.id}:workflow`,
      triggerId,
      label: `Execution ${execLabel(execution.status)}`,
      status: statusToEvent(execution.status),
      timestamp: execution.startedAt,
      body: context.trigger,
      error: execution.status === 'FAILED' ? 'Workflow failed' : undefined,
    },
  ]

  for (const [nodeId, step] of Object.entries(context.steps ?? {})) {
    events.push({
      id: `${execution.id}:${nodeId}`,
      triggerId,
      nodeId,
      label: step.status ?? 'Step',
      status: statusToEvent(step.status ?? execution.status),
      timestamp: execution.endedAt ?? execution.startedAt,
      body: step.output,
      error: step.error ? formatError(step.error) : undefined,
    })
  }

  return events
}

function statusToEvent(status: string): RuntimeEvent['status'] {
  if (status === 'RUNNING') return 'running'
  if (status === 'SUCCESS') return 'success'
  return 'failed'
}

function statusClass(status?: string) {
  if (status === 'RUNNING') return 'gam-status-dot--running'
  if (status === 'SUCCESS') return 'gam-status-dot--success'
  if (status === 'FAILED' || status === 'ERROR') return 'gam-status-dot--failed'
  return ''
}

function triggerLabel(type: ProductionWorkflowStatus['triggerType']): string {
  const labels: Record<string, string> = {
    webhook: 'Webhook',
    cron: 'Cron',
    schedule: 'Schedule',
    event: 'Event',
    'event-listener': 'Event',
    manual: 'Manual',
    plugin: 'Plugin',
    form: 'Form',
    'webhook-form': 'Form',
    subworkflow: 'Sub-workflow',
  }
  return labels[type] ?? type
}

function execLabel(status: string): string {
  const labels: Record<string, string> = {
    SUCCESS: 'Success',
    ERROR: 'Error',
    FAILED: 'Failed',
    RUNNING: 'Running',
  }
  return labels[status] ?? status
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

function toggleEventDetails(eventId: string) {
  const next = new Set(expandedEventIds.value)
  if (next.has(eventId)) next.delete(eventId)
  else next.add(eventId)
  expandedEventIds.value = next
}

function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function formatError(error: unknown): string {
  return typeof error === 'string' ? error : JSON.stringify(error)
}

watch(isAutomationMonitorOpen, (open) => {
  if (open) {
    void profileStore.loadProfiles()
    void refreshLiveData()
  } else {
    selectedExecutions.value = []
    expandedEventIds.value = new Set()
  }
})

watch(triggerTabs, (next) => {
  if (!next.some((tab) => tab.id === activeTriggerTabId.value)) activeTriggerTabId.value = 'all'
})

onMounted(() => {
  pollInterval = setInterval(refreshLiveData, 3_000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
.gam-shell {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
}

.gam-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--sailor-border);
  background: var(--sailor-bg-base);
}

.gam-header,
.gam-main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-3);
  min-height: 68px;
  padding: 0 var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border);
}

.gam-header strong,
.gam-main-header h2 {
  display: block;
  margin: 0;
  font-size: var(--sailor-text-lg);
  font-weight: 650;
}

.gam-eyebrow {
  display: block;
  color: var(--sailor-text-muted);
  font-size: 10px;
  text-transform: uppercase;
}

.gam-icon-btn,
.gam-tool-btn,
.gam-profile-btn,
.gam-profile-menu__item,
.gam-workflow,
.gam-tab {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.gam-icon-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-text-muted);
}

.gam-icon-btn:hover,
.gam-tool-btn:hover,
.gam-profile-btn:hover,
.gam-workflow:hover {
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
}

.gam-profile {
  position: relative;
  padding: var(--sailor-space-3) var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border-muted);
}

.gam-profile-btn,
.gam-tool-btn {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  width: 100%;
  min-height: 34px;
  padding: 0 var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
}

.gam-profile-btn span {
  flex: 1;
  text-align: left;
}

.gam-profile-menu {
  position: absolute;
  z-index: 2;
  top: calc(100% - var(--sailor-space-2));
  left: var(--sailor-space-4);
  right: var(--sailor-space-4);
  padding: var(--sailor-space-1);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  box-shadow: var(--sailor-shadow-lg);
}

.gam-profile-menu__item {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: var(--sailor-space-2);
  border-radius: var(--sailor-radius-sm);
  text-align: left;
}

.gam-profile-menu__item--active,
.gam-profile-menu__item:hover {
  background: var(--sailor-bg-base);
}

.gam-sidebar-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  border-bottom: 1px solid var(--sailor-border);
  background: var(--sailor-border-muted);
}

.gam-sidebar-metrics div {
  padding: var(--sailor-space-3);
  background: var(--sailor-bg-base);
}

.gam-sidebar-metrics span,
.gam-main-meta,
.gam-workflow small,
.gam-event small {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.gam-sidebar-metrics strong {
  display: block;
  margin-top: var(--sailor-space-1);
  font-family: var(--sailor-font-mono);
}

.gam-tools {
  padding: var(--sailor-space-3) var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border-muted);
}

.gam-workflow-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.gam-workflow {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sailor-space-2);
  width: 100%;
  min-height: 52px;
  padding: 0 var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border-muted);
  text-align: left;
}

.gam-workflow--active {
  background: var(--sailor-bg-surface);
}

.gam-status-dot,
.gam-event__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--sailor-text-muted);
}

.gam-status-dot--running,
.gam-event--running .gam-event__dot {
  background: var(--sailor-amber-400);
}

.gam-status-dot--success,
.gam-event--success .gam-event__dot {
  background: var(--sailor-green-400);
}

.gam-status-dot--failed,
.gam-event--failed .gam-event__dot {
  background: var(--sailor-red-400);
}

.gam-workflow__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.gam-workflow__copy strong,
.gam-workflow__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gam-workflow code,
.gam-event code {
  color: var(--sailor-text-muted);
  font-family: var(--sailor-font-mono);
  font-size: 10px;
}

.gam-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.gam-main-meta {
  display: flex;
  gap: var(--sailor-space-2);
}

.gam-main-meta span {
  padding: 3px 8px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
}

.gam-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-2);
  height: 100%;
  color: var(--sailor-text-muted);
}

.gam-tabs {
  display: flex;
  min-height: 38px;
  border-bottom: 1px solid var(--sailor-border);
  background: var(--sailor-bg-base);
  overflow-x: auto;
}

.gam-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--sailor-space-2);
  min-width: 130px;
  padding: 0 var(--sailor-space-3);
  border-right: 1px solid var(--sailor-border);
  color: var(--sailor-text-muted);
}

.gam-tab--active {
  color: var(--sailor-text-primary);
  background: var(--sailor-bg-surface);
}

.gam-tab span {
  flex: 1;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gam-execution-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.gam-timeline {
  display: flex;
  flex-direction: column;
}

.gam-event {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--sailor-border-muted);
}

.gam-event-row {
  display: grid;
  grid-template-columns: 14px 12px minmax(0, 1fr) minmax(120px, auto) minmax(0, 260px);
  align-items: center;
  gap: var(--sailor-space-3);
  min-height: 38px;
  padding: 0 var(--sailor-space-4);
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.gam-event-row:hover {
  background: var(--sailor-bg-base);
}

.gam-event__chevron {
  color: var(--sailor-text-muted);
  transition: transform 160ms ease;
}

.gam-event__chevron--open {
  transform: rotate(90deg);
}

.gam-event__copy {
  min-width: 0;
}

.gam-event__copy strong {
  display: block;
  overflow: hidden;
  font-size: var(--sailor-text-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gam-event__error {
  overflow: hidden;
  color: var(--sailor-red-400);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gam-event-detail {
  padding: var(--sailor-space-3) var(--sailor-space-4) var(--sailor-space-3) 54px;
  border-top: 1px solid var(--sailor-border-muted);
  background: var(--sailor-bg-base);
}

.gam-event-detail pre {
  max-height: 240px;
  margin: 0;
  overflow: auto;
  color: var(--sailor-text-secondary);
  font-family: var(--sailor-font-mono);
  font-size: 11px;
  line-height: 1.5;
}

.gam-event-detail span {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.gam-spin {
  animation: gam-spin 800ms linear infinite;
}

@keyframes gam-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
