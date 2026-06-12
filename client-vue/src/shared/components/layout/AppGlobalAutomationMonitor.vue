<template>
  <BaseModal
    :is-open="isAutomationMonitorOpen"
    max-width="1320px"
    height="86vh"
    @close="isAutomationMonitorOpen = false"
  >
    <section class="gam-shell" :class="{ 'gam-shell--sidebar-collapsed': sidebarCollapsed }">
      <aside class="gam-sidebar" :class="{ 'gam-sidebar--collapsed': sidebarCollapsed }">
        <header class="gam-header">
          <div class="gam-title">
            <span class="gam-header-icon">
              <LucideIcon name="activity" :size="17" />
            </span>
            <span class="gam-eyebrow">Monitoring</span>
            <strong>Automations</strong>
          </div>
          <div class="gam-header-actions">
            <BaseButton
              class="gam-icon-btn"
              type="button"
              size="icon"
              variant="ghost"
              icon-left="refresh-cw"
              :disabled="loading"
              title="Refresh"
              @click="refreshLiveData"
            />
            <BaseButton
              class="gam-icon-btn"
              type="button"
              size="icon"
              variant="ghost"
              :icon-left="sidebarCollapsed ? 'panel-right' : 'panel-left'"
              :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
              @click="sidebarCollapsed = !sidebarCollapsed"
            />
          </div>
        </header>

        <div
          class="gam-workflow-list"
        >
          <BaseButton
            v-for="workflow in filteredWorkflows"
            :key="workflowKey(workflow)"
            class="gam-workflow"
            :class="{ 'gam-workflow--active': workflowKey(workflow) === selectedWorkflowKey }"
            type="button"
            variant="ghost"
            @click="selectWorkflow(workflow)"
          >
            <span class="gam-workflow__copy">
              <span class="gam-workflow__title">
                <strong>{{ workflow.name }}</strong>
                <BaseBadge variant="outline" size="sm" :text="triggerLabel(workflow.triggerType)" />
              </span>
              <small>
                <span>{{ workflow.profileName ?? workflow.profileId ?? 'Global' }}</span>
                <span>{{ workflowRunLabel(workflow) }}</span>
              </small>
            </span>
          </BaseButton>
        </div>
      </aside>

      <main class="gam-main">
        <header class="gam-main-header">
          <div class="gam-main-title">
            <div class="gam-main-eyebrow-row">
              <span class="gam-eyebrow">Realtime workflow view</span>
              <BaseDropdownSelect
                v-model="selectedProfileValue"
                :options="profileSelectOptions"
                direction="down"
                icon-left="user-round"
                trigger-class="gam-profile-trigger"
                menu-class="gam-profile-menu"
              />
            </div>
            <h2>{{ selectedWorkflow?.name ?? 'Select a workflow' }}</h2>
          </div>
          <div class="gam-main-meta" aria-label="Automation runtime summary">
            <span>
              <small>Running</small>
              <strong>{{ runningCount }}</strong>
            </span>
            <span>
              <small>Failed</small>
              <strong>{{ failedCount }}</strong>
            </span>
            <span>
              <small>Published</small>
              <strong>{{ filteredWorkflows.length }}</strong>
            </span>
          </div>
        </header>

        <div v-if="!selectedWorkflow" class="gam-empty">
          <LucideIcon name="activity" :size="28" />
          <span>No published automations for this profile.</span>
        </div>

        <template v-else>
          <div
            class="gam-tabs"
          >
            <BaseButton
              v-for="tab in triggerTabs"
              :key="tab.id"
              class="gam-tab"
              :class="{ 'gam-tab--active': tab.id === activeTriggerTabId }"
              type="button"
              variant="ghost"
              @click="activeTriggerTabId = tab.id"
            >
              <LucideIcon :name="tab.id === 'all' ? 'list-tree' : 'radio'" :size="13" />
              <span>{{ tab.label }}</span>
              <small>{{ tab.events.length }}</small>
            </BaseButton>
          </div>

          <div class="gam-execution-body">
            <div v-if="activeTriggerEvents.length === 0" class="gam-empty">
              <LucideIcon name="clock" :size="20" />
              <span>No execution events yet.</span>
            </div>

            <div
              v-else
              class="gam-timeline"
            >
              <article
                v-for="event in activeTriggerEvents"
                :key="event.id"
                class="gam-event"
                :class="[
                  `gam-event--${event.status}`,
                  { 'gam-event--expanded': expandedEventIds.has(event.id) },
                ]"
              >
                <BaseButton
                  class="gam-event-row"
                  type="button"
                  variant="ghost"
                  @click="toggleEventDetails(event.id)"
                >
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
                </BaseButton>
                <Transition name="gam-event-detail">
                  <div v-if="expandedEventIds.has(event.id)" class="gam-event-detail">
                    <pre v-if="event.error">{{ event.error }}</pre>
                    <pre v-else-if="event.body">{{ formatJson(event.body) }}</pre>
                    <span v-else>No body data for this step.</span>
                  </div>
                </Transition>
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
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseDropdownSelect, { type BaseDropdownSelectOption } from '@/shared/components/base/BaseDropdownSelect.vue'
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
const sidebarCollapsed = ref(false)
const workflows = ref<ProductionWorkflowStatus[]>([])
const selectedProfileId = ref<string | null>(null)
const selectedWorkflowKey = ref<string | null>(null)
const selectedExecutions = ref<ExecutionLog[]>([])
const activeTriggerTabId = ref('all')
const expandedEventIds = ref(new Set<string>())

const profileNameById = computed(() =>
  Object.fromEntries(profileStore.profiles.map((profile) => [profile.id, profile.name])),
)

const profileAvatarById = computed(() =>
  Object.fromEntries(profileStore.profiles.map((profile) => [profile.id, profile.avatarEmoji])),
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

const selectedProfileValue = computed({
  get: () => selectedProfileId.value ?? 'global',
  set: (value: string) => selectProfile(value === 'global' ? null : value),
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

const profileSelectOptions = computed<BaseDropdownSelectOption[]>(() =>
  profileOptions.value.map((profile) => ({
    value: profile.id ?? 'global',
    label: profile.label,
    shortLabel: profile.label,
    description: `${profile.count} published`,
    meta: profile.id ? profileAvatarById.value[profile.id] ?? 'P' : 'G',
  })),
)

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
    chat: 'Chat',
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

function workflowRunLabel(workflow: ProductionWorkflowStatus): string {
  if (!workflow.lastExecution) {
    return `${workflow.publishedAt ? `Published ${formatDate(workflow.publishedAt)}` : 'Published'} / No runs`
  }
  return `Last run ${formatTime(workflow.lastExecution.startTime)}`
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
:deep(.base-modal-container) {
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-surface);
}

.gam-shell {
  display: grid;
  grid-template-columns: 324px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  transition: grid-template-columns var(--sailor-duration-base) var(--sailor-ease-standard);
}

.gam-shell--sidebar-collapsed {
  grid-template-columns: 76px minmax(0, 1fr);
}

.gam-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border-right: 1px solid var(--sailor-border);
  background: color-mix(in srgb, var(--sailor-bg-surface) 82%, var(--sailor-bg-base));
  transition: background var(--sailor-duration-base) var(--sailor-ease-standard);
}

.gam-sidebar--collapsed {
  overflow: hidden;
}

.gam-header,
.gam-main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-3);
  min-height: 72px;
  padding: 0 var(--sailor-space-5);
  border-bottom: 1px solid var(--sailor-border);
}

.gam-title {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 1px var(--sailor-space-3);
  align-items: center;
  min-width: 0;
}

.gam-header-icon {
  display: grid;
  width: 34px;
  height: 34px;
  grid-row: 1 / span 2;
  place-items: center;
  border: 0;
  color: var(--sailor-text-primary);
}

.gam-header-actions {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-1);
}

.gam-header strong,
.gam-main-header h2,
.gam-workflow__copy strong,
.gam-event__copy strong {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gam-header strong,
.gam-main-header h2 {
  display: block;
  font-size: var(--sailor-text-base);
  font-weight: var(--sailor-font-semibold);
  line-height: 1.15;
}

.gam-eyebrow {
  display: block;
  color: var(--sailor-text-muted);
  font-size: 10px;
  line-height: 1.2;
  text-transform: uppercase;
}

.gam-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: var(--sailor-radius-md);
  color: var(--sailor-text-muted);
}

.gam-profile-trigger {
  width: 150px;
  height: 34px;
  justify-content: flex-start;
  border-radius: var(--sailor-radius-full);
}

.gam-profile-trigger :deep(.base-button__label) {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.gam-main-meta,
.gam-workflow small,
.gam-event small {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.gam-workflow-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: var(--sailor-space-2);
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: var(--sailor-space-2);
}

.gam-workflow {
  position: relative;
  z-index: 1;
  width: 100%;
  height: auto;
  min-height: 64px;
  justify-content: stretch;
  border-radius: var(--sailor-radius-md);
  background: transparent;
  padding: 0;
}

.gam-workflow:hover,
.gam-workflow:active {
  background: var(--sailor-button-ghost-hover);
  color: var(--sailor-button-ghost-hover-text);
}

.gam-workflow--active {
  background: var(--sailor-button-ghost-active);
  color: var(--sailor-button-ghost-active-text);
}

.gam-workflow :deep(.base-button__label) {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-2);
  text-align: left;
}

.gam-event__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--sailor-radius-full);
  background: var(--sailor-text-muted);
}

.gam-event--running .gam-event__dot {
  background: var(--sailor-amber-400);
}

.gam-event--success .gam-event__dot {
  background: var(--sailor-green-400);
}

.gam-event--failed .gam-event__dot {
  background: var(--sailor-red-400);
}

.gam-workflow__copy {
  display: grid;
  min-width: 0;
  gap: var(--sailor-space-1);
}

.gam-workflow__title {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  min-width: 0;
}

.gam-workflow__title :deep(.base-badge) {
  flex: 0 0 auto;
  height: 18px;
  padding-inline: var(--sailor-space-2);
  font-size: 10px;
}

.gam-workflow__copy strong {
  min-width: 0;
  font-size: var(--sailor-text-sm);
  font-weight: var(--sailor-font-semibold);
}

.gam-workflow__copy small {
  display: flex;
  min-width: 0;
  gap: var(--sailor-space-2);
}

.gam-workflow__copy small span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gam-workflow__copy small span + span::before {
  content: "/";
  margin-right: var(--sailor-space-2);
  color: var(--sailor-border-strong);
}

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
  background: var(--sailor-bg-surface);
}

.gam-main-title {
  display: grid;
  min-width: 0;
  gap: 0;
}

.gam-main-eyebrow-row {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  min-width: 0;
}

.gam-main-eyebrow-row .gam-eyebrow {
  line-height: 34px;
}

.gam-main-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--sailor-space-2);
}

.gam-main-meta span {
  display: grid;
  min-width: 74px;
  gap: 1px;
  padding: 4px 10px;
  border: 0;
  border-radius: var(--sailor-radius-full);
}

.gam-main-meta small {
  color: var(--sailor-text-muted);
  font-size: 10px;
  line-height: 1;
}

.gam-main-meta strong {
  color: var(--sailor-text-primary);
  font-family: var(--sailor-font-mono);
  font-size: var(--sailor-text-base);
  font-weight: var(--sailor-font-medium);
  line-height: 1.1;
}

.gam-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-2);
  height: 100%;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-sm);
}

.gam-tabs {
  display: flex;
  min-height: 36px;
  border-bottom: 1px solid var(--sailor-border);
  overflow-x: auto;
  padding: var(--sailor-space-1);
}

.gam-tab {
  position: relative;
  z-index: 1;
  min-width: 50px;
  height: 100%;
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-muted);
}

.gam-tab:hover,
.gam-tab:active {
  background: var(--sailor-button-ghost-hover);
  color: var(--sailor-button-ghost-hover-text);
}

.gam-tab :deep(.base-button__label) {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--sailor-space-2);
}

.gam-tab--active {
  color: var(--sailor-text-primary);
  background: var(--sailor-button-ghost-active);
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
  padding: var(--sailor-space-2);
}

.gam-timeline {
  display: flex;
  flex-direction: column;
}

.gam-event {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  overflow: hidden;
}

.gam-event-row {
  width: 100%;
  height: auto;
  min-height: 36px;
  justify-content: stretch;
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  padding: 0;
}

.gam-event-row:hover,
.gam-event-row:active {
  background: var(--sailor-button-ghost-hover);
  color: var(--sailor-button-ghost-hover-text);
}

.gam-event-row :deep(.base-button__label) {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: 14px 12px minmax(0, 1fr) minmax(96px, auto) minmax(0, 240px);
  align-items: center;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-2) var(--sailor-space-3);
  text-align: left;
}

.gam-event__chevron {
  color: var(--sailor-text-muted);
  transition: transform var(--sailor-duration-base) var(--sailor-ease-standard);
}

.gam-event__chevron--open {
  transform: rotate(90deg);
}

.gam-event__copy {
  min-width: 0;
}

.gam-event__copy strong {
  display: block;
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-semibold);
}

.gam-event__error {
  overflow: hidden;
  color: var(--sailor-red-400);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gam-event-detail {
  padding: var(--sailor-space-3) var(--sailor-space-4) var(--sailor-space-4) 48px;
  border-top: 1px solid var(--sailor-border-muted);
  background: var(--sailor-bg-surface);
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

.gam-event-list-enter-active,
.gam-event-list-leave-active,
.gam-event-detail-enter-active,
.gam-event-detail-leave-active {
  transition:
    opacity var(--sailor-duration-base) var(--sailor-ease-standard),
    transform var(--sailor-duration-base) var(--sailor-ease-standard);
}

.gam-event-list-enter-from,
.gam-event-list-leave-to,
.gam-event-detail-enter-from,
.gam-event-detail-leave-to {
  opacity: 0;
  transform: translateY(var(--sailor-space-2));
}

.gam-event-list-move {
  transition: transform var(--sailor-duration-base) var(--sailor-ease-standard);
}

@keyframes gam-spin {
  to {
    transform: rotate(360deg);
  }
}

.gam-sidebar--collapsed .gam-header {
  min-height: 100%;
  flex-direction: column;
  justify-content: flex-start;
  padding: var(--sailor-space-4) var(--sailor-space-3);
}

.gam-sidebar--collapsed .gam-title {
  grid-template-columns: 1fr;
  justify-items: center;
}

.gam-sidebar--collapsed .gam-header-icon {
  grid-row: auto;
}

.gam-sidebar--collapsed .gam-eyebrow,
.gam-sidebar--collapsed .gam-title strong,
.gam-sidebar--collapsed .gam-workflow-list {
  display: none;
}

.gam-sidebar--collapsed .gam-header-actions {
  flex-direction: column;
}

@media (max-width: 880px) {
  .gam-shell {
    grid-template-columns: minmax(240px, 34vw) minmax(0, 1fr);
  }

  .gam-shell--sidebar-collapsed {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .gam-main-header {
    align-items: flex-start;
    flex-direction: column;
    padding-block: var(--sailor-space-3);
  }

  .gam-main-meta {
    width: 100%;
    justify-content: flex-start;
  }

  .gam-profile-trigger {
    width: 136px;
  }

  .gam-event-row :deep(.base-button__label) {
    grid-template-columns: 14px 12px minmax(0, 1fr);
  }

  .gam-event-row code,
  .gam-event__error {
    display: none;
  }
}
</style>
