<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { workflowsApi } from '@/core/api/workflows.api'
import type { WorkflowItem } from '@/core/types/workflow.types'
import BaseDropdownDivider from '@/shared/components/base/dropdown/BaseDropdownDivider.vue'
import BaseDropdownItem from '@/shared/components/base/dropdown/BaseDropdownItem.vue'
import BaseDropdownMenu from '@/shared/components/base/dropdown/BaseDropdownMenu.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { useApi } from '@/shared/composables/useApi'
import { useWorkflowActions } from '@/features/workflow-editor/composables/useWorkflowActions'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  workflowName: string
  workflowId: string
  workflow?: WorkflowItem
  autosaveStatus?: 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
  lastAutosavedAt?: number | null
  isDirty?: boolean
  isBusy?: boolean
  isSaving?: boolean
  showMeta?: boolean
  variant?: 'chrome' | 'topbar'
}>()

const workflowMenuRef = ref<InstanceType<typeof BaseDropdownMenu> | null>(null)
const searchQuery = ref('')
const isWorkflowMenuOpen = ref(false)
const { openWorkflow } = useWorkflowActions()
const { data: workflowsList, execute: fetchWorkflows } = useApi(workflowsApi.getAll, [])

const saveState = computed<'saving' | 'dirty' | 'saved'>(() => {
  if (props.isSaving || props.autosaveStatus === 'saving') return 'saving'
  if (props.isDirty || props.autosaveStatus === 'conflict') return 'dirty'
  return 'saved'
})

const saveStatusLabel = computed(() => {
  if (saveState.value === 'saving') return 'Saving workflow...'
  if (saveState.value === 'dirty') return 'Unsaved changes'
  return props.lastAutosavedAt ? `Saved ${getRelativeTime(props.lastAutosavedAt)}` : 'Saved'
})

const saveStatusIcon = computed(() => {
  if (saveState.value === 'saving') return 'loader-circle'
  if (saveState.value === 'dirty') return 'cloud-alert'
  return 'cloud-check'
})

const filteredWorkflows = computed(() => {
  const list = workflowsList.value ?? []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((workflow) => workflow.metadata.name.toLowerCase().includes(q))
})

const nodeCountLabel = computed(() => {
  const count = props.workflow ? Object.keys(props.workflow.nodes).length : 0
  return count === 1 ? '1 node' : `${count} nodes`
})

const versionLabel = computed(() => `v${props.workflow?.metadata.version ?? '1'}`)

const workflowIdLabel = computed(() => props.workflowId ? props.workflowId.slice(0, 8) : 'new')

const publishLabel = computed(() => {
  if (!props.workflow) return 'Draft'
  if (props.workflow.metadata.isActive && !props.workflow.metadata.isDraft) return 'Live'
  return props.workflow.metadata.isDraft ? 'Draft' : 'Inactive'
})

function openWorkflowMenu() {
  workflowMenuRef.value?.open()
}

function handleWorkflowMenuOpen() {
  isWorkflowMenuOpen.value = true
  fetchWorkflows().catch(console.error)
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

watch(
  () => props.workflowId,
  () => {
    fetchWorkflows().catch(console.error)
  },
)

defineExpose({ openWorkflowMenu })
</script>

<template>
  <div class="wec-row wec-header" :class="`wec-header--${variant ?? 'chrome'}`">
    <div class="wec-doc">
      <BaseDropdownMenu
        ref="workflowMenuRef"
        position="bottom-start"
        :offset="3"
        max-height="350px"
        @open="handleWorkflowMenuOpen"
        @close="isWorkflowMenuOpen = false"
      >
        <template #trigger>
          <button
            class="wec-doc__name"
            :class="{ 'wec-doc__name--open': isWorkflowMenuOpen }"
            style="padding: 5px 8px"
            type="button"
          >
            <span>{{ workflowName }}</span>
            <LucideIcon class="wec-doc__chevron" name="chevron-down" :size="13" />
          </button>
        </template>

        <template #fixed>
          <div class="wec-workflow-search">
            <BaseInput
              v-model="searchQuery"
              icon-left="search"
              placeholder="Search workflows..."
              @click.stop
            />
          </div>
          <BaseDropdownDivider />
        </template>

        <template v-if="filteredWorkflows.length > 0">
          <BaseDropdownItem
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
          </BaseDropdownItem>
        </template>

        <div v-else class="wec-menu-empty">No workflows match "{{ searchQuery }}"</div>
      </BaseDropdownMenu>

      <span class="wec-doc__status">
        <LucideIcon
          class="wec-save-status__icon"
          :class="{ 'wec-save-status__icon--spin': saveState === 'saving' }"
          :name="saveStatusIcon"
          :size="19"
        />
        {{ saveStatusLabel }}
      </span>
    </div>

    <div v-if="showMeta !== false" class="wec-header-meta" aria-label="Workflow metadata">
      <span class="wec-meta-pill wec-meta-pill--version">{{ versionLabel }}</span>
      <span class="wec-meta-pill wec-meta-pill--nodes">{{ nodeCountLabel }}</span>
      <span class="wec-meta-pill" :class="{ 'wec-meta-pill--live': publishLabel === 'Live' }">
        {{ publishLabel }}
      </span>
      <span class="wec-meta-pill wec-meta-pill--id">{{ workflowIdLabel }}</span>
    </div>
  </div>
</template>
