<script setup lang="ts">
import { useWorkflowActions, useWorkflowStore } from '@/features/workflow-editor'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import AppPage from '@/shared/components/layout/AppPage.vue'
import AppDock from '@/shared/components/layout/AppDock.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownDivider from '@/shared/components/overlay/Dropdown/AppDropdownDivider.vue'
import { useApi } from '@/shared/composables/useApi'
import { workflowsApi } from '@/core/api/workflows.api'
import { onMounted, watch, ref, computed } from 'vue'
import type { WorkflowItem } from '@/core/types/workflow.types'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

// ── Stores & Actions ────────────────────────────────────────────────────────

const workflowStore = useWorkflowStore()
const { openWorkflow } = useWorkflowActions()

// ── Workflow list ────────────────────────────────────────────────────────────

const {
  data: workflowsList,
  execute: fetchWorkflows,
  loading: isRefreshing,
} = useApi(workflowsApi.getAll, [])

onMounted(() => {
  fetchWorkflows().catch(console.error)
})

watch(
  () => workflowStore.activeWorkflow,
  (workflow) => {
    if (workflow) {
      openWorkflow(workflow)
    }
  },
  { immediate: true },
)

// ── Search ───────────────────────────────────────────────────────────────────

const searchQuery = ref('')

const filteredWorkflows = computed(() => {
  const list = workflowsList.value ?? []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((w) => w.metadata.name.toLowerCase().includes(q))
})

// ── View mode ────────────────────────────────────────────────────────────────

const viewMode = ref<'grid' | 'list'>('grid')

// ── Last run badge ───────────────────────────────────────────────────────────

interface LastRun {
  status: string
  startTime: number
}

const lastRun = ref<LastRun | null>(null)

async function fetchLastRun(workflowId: string) {
  try {
    const executions = await workflowsApi.getExecutions(workflowId)
    if (executions.length > 0) {
      lastRun.value = {
        status: executions[0]?.status ?? '',
        startTime: executions[0]?.startedAt ?? 0,
      }
    } else {
      lastRun.value = null
    }
  } catch {
    lastRun.value = null
  }
}

// Pull last-run whenever the selected workflow changes from the dropdown.
// (activeWorkflow is set via openWorkflow but we track it for the badge)

// ── Create workflow ──────────────────────────────────────────────────────────

const { execute: createWorkflow, loading: isCreating } = useApi(workflowsApi.create)

async function handleCreate() {
  const newWorkflow: WorkflowItem = {
    metadata: {
      id: crypto.randomUUID(),
      name: 'New Workflow',
      version: '1',
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: new Date().toISOString(),
    },
    trigger: { type: 'manual' },
    nodes: {},
    edges: [],
  }

  try {
    const created = await createWorkflow(newWorkflow)
    await fetchWorkflows()
    openWorkflow(created)
  } catch (e) {
    console.error('Failed to create workflow', e)
  }
}

// ── Import ───────────────────────────────────────────────────────────────────

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const workflow: WorkflowItem = JSON.parse(text)
      // Assign a fresh ID + timestamps on import
      workflow.metadata.id = crypto.randomUUID()
      workflow.metadata.createdAt = new Date().toISOString()
      workflow.metadata.isDraft = true
      const created = await createWorkflow(workflow)
      await fetchWorkflows()
      openWorkflow(created)
    } catch (e) {
      console.error('Failed to import workflow', e)
    }
  }
  input.click()
}

// ── Relative time helper ─────────────────────────────────────────────────────

function getRelativeTime(ms: number): string {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'Just now'
}

// ── Last run computed helpers ────────────────────────────────────────────────

const lastRunClass = computed(() => {
  if (!lastRun.value) return ''
  const s = lastRun.value.status
  if (s === 'SUCCESS') return 'last-run--success'
  if (s === 'RUNNING') return 'last-run--running'
  return 'last-run--error'
})

const lastRunIcon = computed(() => {
  if (!lastRun.value) return ''
  const s = lastRun.value.status
  if (s === 'SUCCESS') return 'check-circle-2'
  if (s === 'RUNNING') return 'activity'
  return 'x-circle'
})

// ── Workflow count ───────────────────────────────────────────────────────────

const workflowCount = computed(() => workflowsList.value?.length ?? 0)

// ── Open workflow and fetch its last run ─────────────────────────────────────

function handleOpenWorkflow(workflow: WorkflowItem) {
  openWorkflow(workflow)
  fetchLastRun(workflow.metadata.id)
}
</script>

<template>
  <AppPage>
    <!-- Dock local, nativo e robusto desta página! Não sofre com desmontagem de rotas -->
    <template #dock>
      <AppDock>
        <!-- ── LEFT: brand badge + workflow switcher ───────────────────── -->
        <template #left>
          <AppDropdownMenu position="bottom-start" :offset="3">
            <template #trigger>
              <button class="brand-badge gap-2 flex-center">
                <LucideIcon name="workflow" :size="14" class="brand-badge__icon" />
                <span class="brand-badge__title">Workflows</span>
                <span class="brand-badge__count">{{ workflowCount }}</span>
                <LucideIcon name="chevron-down" :size="12" class="brand-badge__chevron" />
              </button>
            </template>

            <!-- Search -->
            <div class="dock-search" :style="{ padding: 0 }">
              <BaseInput
                v-model="searchQuery"
                icon-left="search"
                placeholder="Search workflows…"
                @click.stop
              />
            </div>

            <AppDropdownDivider />

            <AppDropdownItem icon="cloud-upload" label="Import from JSON" @click="handleImport" />
            <AppDropdownItem
              icon="plus-circle"
              label="Create Workflow"
              :disabled="isCreating"
              @click="handleCreate"
            />

            <template v-if="filteredWorkflows.length > 0">
              <AppDropdownDivider />

              <template v-for="workflow in filteredWorkflows" :key="workflow.metadata.id">
                <AppDropdownItem
                  icon="workflow"
                  :label="workflow.metadata.name"
                  @click="handleOpenWorkflow(workflow)"
                >
                  <template #element>
                    <div class="dropdown-item-container">
                      <div class="dic-row">
                        <span class="text-xs text-muted font-mono tracking-tight text-truncate">
                          {{ workflow.metadata.id.slice(0, 13) }}…
                        </span>
                        <span class="text-xs text-muted font-mono tracking-tight">
                          {{
                            (() => {
                              const nodes = Object.keys(workflow.nodes).length
                              return nodes === 1 ? `${nodes} Node` : `${nodes} Nodes`
                            })()
                          }}
                        </span>
                      </div>
                      <div class="dic-row" style="margin-top: 4px;">
                        <span
                          class="workflow-badge"
                          :class="{
                            'workflow-badge--draft': workflow.metadata.isDraft,
                            'workflow-badge--published': !workflow.metadata.isDraft && workflow.metadata.isActive,
                            'workflow-badge--inactive': !workflow.metadata.isDraft && !workflow.metadata.isActive,
                          }"
                        >
                          {{ workflow.metadata.isDraft ? 'Draft' : workflow.metadata.isActive ? 'Published' : 'Inactive' }}
                        </span>
                        <span v-if="workflow.metadata.publishedAt" class="text-xs text-muted" style="font-size: 10px;">
                          {{ getRelativeTime(new Date(workflow.metadata.publishedAt).getTime()) }}
                        </span>
                      </div>
                    </div>
                  </template>
                </AppDropdownItem>
              </template>
            </template>

            <template v-else-if="searchQuery">
              <AppDropdownDivider />
              <div class="dock-empty">No workflows match "{{ searchQuery }}"</div>
            </template>
          </AppDropdownMenu>
        </template>

        <!-- ── RIGHT: last-run badge + view toggle + refresh + new ───────── -->
        <template #right>
          <!-- Last run badge -->
          <div v-if="lastRun" class="last-run" :class="lastRunClass" title="Last execution result">
            <LucideIcon
              :name="lastRunIcon"
              :size="12"
              :class="{ 'icon-pulse': lastRun.status === 'RUNNING' }"
            />
            <LucideIcon name="clock" :size="12" class="opacity-70" />
            <span>{{ getRelativeTime(lastRun.startTime) }}</span>
          </div>

          <div v-if="lastRun" class="dock-divider" />

          <div class="flex flex-center gap-4">
            <div class="flex flex-center gap-1">
              <!-- Refresh -->
              <BaseButton
                :disabled="isCreating"
                variant="ghost"
                size="sm"
                :icon-left="isCreating ? 'loader-2' : 'refresh-cw'"
                title="Refresh workflows"
                @click="fetchWorkflows()"
              />

              <!-- Import -->
              <BaseButton
                :disabled="isCreating"
                variant="ghost"
                size="sm"
                :icon-left="isCreating ? 'loader-2' : 'share-2'"
                title="Import workflow from JSON"
                @click="handleImport"
              />
            </div>

            <div class="dock-divider" />

            <!-- New Workflow CTA -->
            <BaseButton
              :disabled="isCreating"
              variant="outline"
              size="sm"
              :icon-left="isCreating ? 'loader-2' : 'plus'"
              @click="handleCreate"
            >
              New Workflow
            </BaseButton>
          </div>
        </template>
      </AppDock>
    </template>
  </AppPage>
</template>

<style scoped>
/* ── Brand badge (left trigger) ────────────────────────────────────────────── */

.brand-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--nod8-text-secondary);
  cursor: pointer;
  transition:
    background var(--nod8-duration-fast) var(--nod8-ease-standard),
    border-color var(--nod8-duration-fast) var(--nod8-ease-standard),
    color var(--nod8-duration-fast) var(--nod8-ease-standard);
}

.brand-badge:hover {
  background: var(--nod8-bg-muted);
  border-color: var(--nod8-border);
  color: var(--nod8-text-primary);
}

.brand-badge__icon {
  opacity: 0.8;
  flex-shrink: 0;
}

.brand-badge__title {
  font-size: var(--nod8-text-sm);
  font-weight: 500;
}

.brand-badge__count {
  font-size: 10px;
  font-weight: 600;
  font-family: var(--nod8-font-mono);
  padding: 1px 5px;
  border-radius: 99px;
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-muted);
  line-height: 1.4;
}

.brand-badge__chevron {
  opacity: 0.5;
  flex-shrink: 0;
}

/* ── Search inside dropdown ────────────────────────────────────────────────── */

.dock-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin: 4px 6px;
  border-radius: var(--nod8-radius-sm);
  background: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
}

.dock-search__icon {
  color: var(--nod8-text-muted);
  flex-shrink: 0;
}

.dock-search__input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--nod8-text-sm);
  color: var(--nod8-text-primary);
  min-width: 0;
}

.dock-search__input::placeholder {
  color: var(--nod8-text-muted);
}

/* ── Empty state ───────────────────────────────────────────────────────────── */

.dock-empty {
  padding: 8px 12px;
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-style: italic;
}

/* ── Right section utils ───────────────────────────────────────────────────── */

.dock-divider {
  width: 1px;
  height: 16px;
  background: var(--nod8-border);
  flex-shrink: 0;
}

/* ── Last run badge ────────────────────────────────────────────────────────── */

.last-run {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid;
  font-size: var(--nod8-text-xs);
  font-weight: 500;
}

.last-run--success {
  background: rgba(52, 211, 153, 0.1);
  border-color: rgba(52, 211, 153, 0.25);
  color: #34d399;
}

.last-run--running {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.25);
  color: #fbbf24;
}

.last-run--error {
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.25);
  color: #f87171;
}

/* ── View mode toggle ──────────────────────────────────────────────────────── */

.view-toggle {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: var(--nod8-radius-sm);
  background: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
}

.view-toggle__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  border-radius: calc(var(--nod8-radius-sm) - 2px);
  border: none;
  background: transparent;
  color: var(--nod8-text-muted);
  cursor: pointer;
  transition:
    background var(--nod8-duration-fast) var(--nod8-ease-standard),
    color var(--nod8-duration-fast) var(--nod8-ease-standard);
}

.view-toggle__btn:hover {
  color: var(--nod8-text-primary);
  background: var(--nod8-bg-surface);
}

.view-toggle__btn--active {
  background: var(--nod8-bg-surface);
  color: var(--nod8-text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* ── Icon buttons (refresh / import) ──────────────────────────────────────── */

.dock-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--nod8-radius-sm);
  border: none;
  background: transparent;
  color: var(--nod8-text-muted);
  cursor: pointer;
  transition:
    background var(--nod8-duration-fast) var(--nod8-ease-standard),
    color var(--nod8-duration-fast) var(--nod8-ease-standard);
}

.dock-icon-btn:hover:not(:disabled) {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
}

.dock-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── CTA button ────────────────────────────────────────────────────────────── */

.dock-cta {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--nod8-radius-sm);
  border: none;
  background: var(--nod8-accent, #6366f1);
  color: #fff;
  font-size: var(--nod8-text-xs);
  font-weight: 600;
  cursor: pointer;
  transition:
    opacity var(--nod8-duration-fast) var(--nod8-ease-standard),
    transform var(--nod8-duration-fast) var(--nod8-ease-standard);
  white-space: nowrap;
}

.dock-cta:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}

.dock-cta:active:not(:disabled) {
  transform: translateY(0);
}

.dock-cta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Animations ────────────────────────────────────────────────────────────── */

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse-fade {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.icon-spin {
  animation: spin 0.9s linear infinite;
}

.icon-pulse {
  animation: pulse-fade 1.2s ease-in-out infinite;
}

.dock-icon-btn--spinning :deep(svg) {
  animation: spin 0.9s linear infinite;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

.text-truncate {
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-item-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.dic-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* ── Status badges ─────────────────────────────────────────────────────────── */

.workflow-badge {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: var(--nod8-radius-sm);
  line-height: 1;
}

.workflow-badge--draft {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-secondary);
}

.workflow-badge--published {
  background: color-mix(in srgb, var(--nod8-green-400) 15%, transparent);
  color: var(--nod8-green-400);
}

.workflow-badge--inactive {
  background: color-mix(in srgb, #f97316 15%, transparent);
  color: #f97316;
}
</style>
