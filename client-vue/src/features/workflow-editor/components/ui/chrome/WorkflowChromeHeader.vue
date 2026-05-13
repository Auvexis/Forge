<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { workflowsApi } from '@/core/api/workflows.api'
import type { WorkflowItem } from '@/core/types/workflow.types'
import AppDropdownDivider from '@/shared/components/overlay/Dropdown/AppDropdownDivider.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useApi } from '@/shared/composables/useApi'
import { useWorkflowActions } from '@/features/workflow-editor/composables/useWorkflowActions'
import WorkflowPublishButton from '../WorkflowPublishButton.vue'

const props = defineProps<{
  workflowName: string
  workflowId: string
  workflow?: WorkflowItem
  autosaveStatus?: 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
  lastAutosavedAt?: number | null
  isDirty?: boolean
  isAutosaveEnabled?: boolean
  isBusy?: boolean
  isSaving?: boolean
  isUnsavedDraft?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-autosave', enabled: boolean): void
  (e: 'workflow-updated', workflow: WorkflowItem): void
}>()

const route = useRoute()
const workflowMenuRef = ref<InstanceType<typeof AppDropdownMenu> | null>(null)
const searchQuery = ref('')
const { openWorkflow } = useWorkflowActions()
const { data: workflowsList, execute: fetchWorkflows } = useApi(workflowsApi.getAll, [])

const statusLabel = computed(() => {
  if (props.autosaveStatus === 'saving') return 'Autosaving'
  if (props.autosaveStatus === 'saved') return props.lastAutosavedAt ? `Saved ${getRelativeTime(props.lastAutosavedAt)}` : 'Saved'
  if (props.autosaveStatus === 'conflict') return 'Save conflict'
  if (props.isDirty) return 'Unsaved changes'
  return props.workflowId ? props.workflowId.slice(0, 14) : 'New Workflow'
})

const filteredWorkflows = computed(() => {
  const list = workflowsList.value ?? []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((workflow) => workflow.metadata.name.toLowerCase().includes(q))
})

function openWorkflowMenu() {
  workflowMenuRef.value?.open()
}

function handleOpenWorkflow(workflow: WorkflowItem) {
  openWorkflow(workflow)
}

function getRelativeTime(ms: number): string {
  const diff = Date.now() - ms
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

onMounted(() => {
  fetchWorkflows().catch(console.error)
})

watch(() => props.workflowId, () => {
  fetchWorkflows().catch(console.error)
})

watch(() => props.isSaving, (isSaving) => {
  if (!isSaving) fetchWorkflows().catch(console.error)
})

defineExpose({ openWorkflowMenu })
</script>

<template>
  <div class="wec-row wec-header">
    <div class="wec-doc">
      <div class="wec-doc__icon">
        <LucideIcon name="workflow" :size="18" />
      </div>

      <AppDropdownMenu ref="workflowMenuRef" position="bottom-start" :offset="3" max-height="350px">
        <template #trigger>
          <button class="wec-doc__name" type="button">
            <span>{{ workflowName }}</span>
            <LucideIcon name="chevron-down" :size="13" />
          </button>
        </template>

        <template #fixed>
          <div class="wec-workflow-search">
            <BaseInput v-model="searchQuery" icon-left="search" placeholder="Search workflows..." @click.stop />
          </div>
          <AppDropdownDivider />
        </template>

        <template v-if="filteredWorkflows.length > 0">
          <AppDropdownItem
            v-for="item in filteredWorkflows"
            :key="item.metadata.id"
            icon="workflow"
            :label="item.metadata.name"
            @click="handleOpenWorkflow(item)"
          >
            <template #element>
              <div class="wec-workflow-option">
                <span>{{ item.metadata.id.slice(0, 13) }}...</span>
                <span>{{ Object.keys(item.nodes).length }} nodes</span>
              </div>
            </template>
          </AppDropdownItem>
        </template>

        <div v-else class="wec-menu-empty">No workflows match "{{ searchQuery }}"</div>
      </AppDropdownMenu>

      <span class="wec-doc__status">
        <span
          class="wec-status-dot"
          :class="{
            'wec-status-dot--running': isBusy,
            'wec-status-dot--dirty': isDirty && !isBusy,
          }"
        />
        {{ statusLabel }}
      </span>
    </div>

    <div class="wec-header-actions">
      <BaseSwitch
        class="wec-autosave"
        :model-value="!!isAutosaveEnabled"
        :disabled="isBusy || isSaving"
        title="Toggle autosave for this workflow"
        @update:model-value="emit('toggle-autosave', $event)"
      >
        Autosave
      </BaseSwitch>

      <WorkflowPublishButton
        v-if="workflow"
        :workflow="workflow"
        :disabled="isUnsavedDraft"
        @updated="emit('workflow-updated', $event)"
      />

      <span v-if="route.params.id" class="wec-route-id">{{ String(route.params.id).slice(0, 8) }}</span>
    </div>
  </div>
</template>
