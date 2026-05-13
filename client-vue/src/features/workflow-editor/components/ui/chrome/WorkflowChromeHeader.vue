<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { workflowsApi } from '@/core/api/workflows.api'
import type { WorkflowItem } from '@/core/types/workflow.types'
import AppDropdownDivider from '@/shared/components/overlay/Dropdown/AppDropdownDivider.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
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
}>()

const workflowMenuRef = ref<InstanceType<typeof AppDropdownMenu> | null>(null)
const searchQuery = ref('')
const isWorkflowMenuOpen = ref(false)
const { openWorkflow } = useWorkflowActions()
const { data: workflowsList, execute: fetchWorkflows } = useApi(workflowsApi.getAll, [])

const statusLabel = computed(() => {
  if (props.autosaveStatus === 'saving') return 'Autosaving'
  if (props.autosaveStatus === 'saved')
    return props.lastAutosavedAt ? `Saved ${getRelativeTime(props.lastAutosavedAt)}` : 'Saved'
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

const nodeCountLabel = computed(() => {
  const count = props.workflow ? Object.keys(props.workflow.nodes).length : 0
  return count === 1 ? '1 node' : `${count} nodes`
})

const versionLabel = computed(() => `v${props.workflow?.metadata.version ?? '1'}`)

const publishLabel = computed(() => {
  if (!props.workflow) return 'Draft'
  if (props.workflow.metadata.isActive && !props.workflow.metadata.isDraft) return 'Live'
  return props.workflow.metadata.isDraft ? 'Draft' : 'Inactive'
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

watch(
  () => props.workflowId,
  () => {
    fetchWorkflows().catch(console.error)
  },
)

defineExpose({ openWorkflowMenu })
</script>

<template>
  <div class="wec-row wec-header">
    <div class="wec-doc">
      <AppDropdownMenu
        ref="workflowMenuRef"
        position="bottom-start"
        :offset="3"
        max-height="350px"
        @open="isWorkflowMenuOpen = true"
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

    <div class="wec-header-meta" aria-label="Workflow metadata">
      <span class="wec-meta-pill">{{ versionLabel }}</span>
      <span class="wec-meta-pill">{{ nodeCountLabel }}</span>
      <span class="wec-meta-pill" :class="{ 'wec-meta-pill--live': publishLabel === 'Live' }">
        {{ publishLabel }}
      </span>
    </div>
  </div>
</template>
