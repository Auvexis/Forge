<template>
  <AppDock>
    <!-- ── Left: Brand badge + Workflow name + status ── -->
    <template #left>
      <div class="wed-brand">
        <!-- Icon tile -->
        <div class="wed-brand__icon">
          <LucideIcon name="workflow" :size="14" />
        </div>

        <!-- Name + status row -->
        <div class="wed-brand__meta">
          <!-- Workflow name → opens dropdown -->
          <AppDropdownMenu position="bottom-start" :offset="3" max-height="350px">
            <template #trigger>
              <div class="flex flex-col gap-1">
                <div class="wed-name-wrap">
                  <span class="wed-name">{{ workflowName }}</span>
                  <LucideIcon name="chevron-down" :size="12" class="wed-name__chevron" />
                </div>

                <!-- Status / ID sub-row -->
                <div class="wed-status-row">
                  <span
                    class="wed-status-dot"
                    :class="{
                      'wed-status-dot--streaming': isStreaming,
                      'wed-status-dot--dirty': isDirty && !isStreaming,
                    }"
                  />
                  <span class="wed-status-text">
                    <template v-if="isStreaming">Running</template>
                    <template v-else-if="autosaveStatus === 'saving'">Autosaving</template>
                    <template v-else-if="autosaveStatus === 'saved'">Saved {{ autosaveLabel }}</template>
                    <template v-else-if="autosaveStatus === 'conflict'">Save Conflict</template>
                    <template v-else-if="isDirty">Unsaved Changes</template>
                    <template v-else>{{ workflowId?.slice(0, 14) || 'New Workflow' }}</template>
                  </span>
                </div>
              </div>
            </template>

            <template #fixed>
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
                :disabled="isCreating || isUnsavedDraft"
                @click="handleCreate"
              />
              
              <AppDropdownItem icon="download" :danger="false" @click="$emit('export-workflow')">
                Export workflow
              </AppDropdownItem>

              <AppDropdownDivider />
            </template>

            <template v-if="filteredWorkflows.length > 0">
              <template v-for="w in filteredWorkflows" :key="w.metadata.id">
                <AppDropdownItem
                  icon="workflow"
                  :label="w.metadata.name"
                  @click="handleOpenWorkflow(w)"
                >
                  <template #element>
                    <div class="dropdown-item-container">
                      <div class="dic-row">
                        <span class="text-xs text-muted font-mono tracking-tight text-truncate">
                          {{ w.metadata.id.slice(0, 13) }}…
                        </span>
                        <span class="text-xs text-muted font-mono tracking-tight">
                          {{
                            (() => {
                              const nodes = Object.keys(w.nodes).length
                              return nodes === 1 ? `${nodes} Node` : `${nodes} Nodes`
                            })()
                          }}
                        </span>
                      </div>
                      <div class="dic-row" style="margin-top: 4px;">
                        <span
                          class="workflow-badge"
                          :class="{
                            'workflow-badge--draft': w.metadata.isDraft,
                            'workflow-badge--published': !w.metadata.isDraft && w.metadata.isActive,
                            'workflow-badge--inactive': !w.metadata.isDraft && !w.metadata.isActive,
                          }"
                        >
                          {{ w.metadata.isDraft ? 'Draft' : w.metadata.isActive ? 'Published' : 'Inactive' }}
                        </span>
                        <span v-if="w.metadata.publishedAt" class="text-xs text-muted" style="font-size: 10px;">
                          {{ getRelativeTime(new Date(w.metadata.publishedAt).getTime()) }}
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
        </div>
      </div>

      <!-- Section divider -->
      <div class="wed-divider-v" />
    </template>

    <!-- ── Right: All action buttons ── -->
    <template #right>
      <!-- Add Node -->
      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="plus"
        :disabled="isBusy"
        @click="$emit('add-node')"
      >
        Add Node
      </BaseButton>

      <!-- Settings -->
      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="settings"
        :disabled="isBusy"
        title="Workflow settings"
        @click="$emit('settings')"
      />

      <div class="wed-divider-v" />

      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="undo-2"
        title="Undo"
        :disabled="!canUndo || isBusy"
        @click="$emit('undo')"
      />

      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="redo-2"
        title="Redo"
        :disabled="!canRedo || isBusy"
        @click="$emit('redo')"
      />

      <div class="wed-divider-v" />

      <!-- Logs -->
      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="scroll-text"
        :class="{ 'wed-btn--active': isLogsOpen }"
        @click="$emit('toggle-logs')"
      >
        Logs
      </BaseButton>

      <!-- Stop (shown while streaming) -->
      <BaseButton
        v-if="isStreaming"
        size="sm"
        variant="danger"
        icon-left="square"
        @click="$emit('stop')"
      >
        Stop
      </BaseButton>

      <!-- Run -->
      <BaseButton
        v-else
        size="sm"
        variant="ghost"
        :disabled="isExecuting"
        :loading="isExecuting"
        icon-left="play"
        class="wed-btn--run"
        @click="$emit('run')"
      >
        Run
      </BaseButton>

      <div class="wed-divider-v" />

      <BaseButton
        size="sm"
        :variant="isAutosaveEnabled ? 'primary' : 'ghost'"
        :icon-left="isAutosaveEnabled ? 'toggle-right' : 'toggle-left'"
        :disabled="isBusy || isSaving"
        title="Toggle autosave for this workflow"
        @click="$emit('toggle-autosave', !isAutosaveEnabled)"
      >
        Autosave
      </BaseButton>

      <div class="wed-divider-v" />

      <!-- Save -->
      <BaseButton
        size="sm"
        :variant="isDirty ? 'primary' : 'ghost'"
        :disabled="isSaving || !isDirty || isBusy"
        :loading="isSaving"
        icon-left="save"
        @click="$emit('save')"
      >
        {{ isSaving ? 'Saving…' : 'Save' }}
      </BaseButton>

      <div class="wed-divider-v" />

      <!-- Publish/Unpublish -->
      <WorkflowPublishButton
        v-if="workflow"
        :workflow="workflow"
        :disabled="isUnsavedDraft"
        @updated="$emit('workflow-updated', $event)"
      />

      <!-- Close -->
      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="x"
        title="Close editor"
        class="wed-btn--close"
        :disabled="isUnsavedDraft"
        @click="$emit('close')"
      />
    </template>
  </AppDock>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppDock from '@/shared/components/layout/AppDock.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownDivider from '@/shared/components/overlay/Dropdown/AppDropdownDivider.vue'
import WorkflowPublishButton from './WorkflowPublishButton.vue'
import type { WorkflowItem } from '@/core/types/workflow.types'
import { workflowsApi } from '@/core/api/workflows.api'
import { useApi } from '@/shared/composables/useApi'
import { useWorkflowActions } from '@/features/workflow-editor/composables/useWorkflowActions'

// ── Props ─────────────────────────────────────────────────────────────────

const props = defineProps<{
  workflowName: string
  workflowId: string
  workflow?: WorkflowItem
  isSaving?: boolean
  isExecuting?: boolean
  isStreaming?: boolean
  isLogsOpen?: boolean
  isDirty?: boolean
  autosaveStatus?: 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
  lastAutosavedAt?: number | null
  isAutosaveEnabled?: boolean
  canUndo?: boolean
  canRedo?: boolean
}>()

// ── Emits ─────────────────────────────────────────────────────────────────

defineEmits<{
  (e: 'save'): void
  (e: 'add-node'): void
  (e: 'run'): void
  (e: 'stop'): void
  (e: 'export-workflow'): void
  (e: 'toggle-logs'): void
  (e: 'settings'): void
  (e: 'close'): void
  (e: 'workflow-updated', w: WorkflowItem): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'toggle-autosave', enabled: boolean): void
}>()

const route = useRoute()
const isUnsavedDraft = computed(() => !route.params.id)

// ── Derived ───────────────────────────────────────────────────────────────

const isBusy = computed(() => props.isExecuting || props.isStreaming)
const autosaveLabel = computed(() => {
  if (!props.lastAutosavedAt) return ''
  return getRelativeTime(props.lastAutosavedAt)
})

// ── Dropdown Logic ────────────────────────────────────────────────────────

const { openWorkflow } = useWorkflowActions()

const {
  data: workflowsList,
  execute: fetchWorkflows,
} = useApi(workflowsApi.getAll, [])

onMounted(() => {
  fetchWorkflows().catch(console.error)
})

watch(() => props.workflowId, () => {
  fetchWorkflows().catch(console.error)
})

watch(() => props.isSaving, (isSaving) => {
  if (!isSaving) fetchWorkflows().catch(console.error)
})

const searchQuery = ref('')

const filteredWorkflows = computed(() => {
  const list = workflowsList.value ?? []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((w) => w.metadata.name.toLowerCase().includes(q))
})

const { execute: createWorkflowApi, loading: isCreating } = useApi(workflowsApi.create)

async function handleCreate() {
  const newWorkflow: WorkflowItem = {
    metadata: {
      id: crypto.randomUUID(),
      name: 'New Workflow',
      version: '1',
      isActive: false,
      isDraft: true,
      public: false,
      autosaveEnabled: false,
      createdAt: new Date().toISOString(),
    },
    trigger: { type: 'manual' },
    nodes: {},
    edges: [],
  }

  try {
    const created = await createWorkflowApi(newWorkflow)
    await fetchWorkflows()
    openWorkflow(created)
  } catch (e) {
    console.error('Failed to create workflow', e)
  }
}

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
      workflow.metadata.id = crypto.randomUUID()
      workflow.metadata.createdAt = new Date().toISOString()
      workflow.metadata.isDraft = true
      const created = await createWorkflowApi(workflow)
      await fetchWorkflows()
      openWorkflow(created)
    } catch (e) {
      console.error('Failed to import workflow', e)
    }
  }
  input.click()
}

function handleOpenWorkflow(w: WorkflowItem) {
  openWorkflow(w)
}

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
</script>
