<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { ExecutionLog } from '@/core/types/execution.types'
import { workflowsApi } from '@/core/api/workflows.api'
import ExecutionRunExplorer from '@/shared/components/execution/ExecutionRunExplorer.vue'
import { buildLiveExecutionLog } from '@/shared/components/execution/executionRunTreeModel'
import { useProfileStore } from '@/shared/stores/profile.store'
import { useExecutionStore } from '../../stores/execution.store'
import { useWorkflowStore } from '../../stores/workflow.store'

const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()
const profileStore = useProfileStore()
const historyRuns = ref<ExecutionLog[]>([])
const historyLoading = ref(false)
const currentProfileId = computed(() => profileStore.currentProfile?.id)

const liveRun = computed(() => buildLiveExecutionLog({
  executionId: executionStore.activeExecutionId,
  workflowId: workflowStore.activeWorkflow?.metadata.id ?? null,
  workflowStatus: executionStore.workflowStatus,
  timeline: executionStore.timeline,
  nodeStatuses: executionStore.nodeStatuses,
}))

const visibleRuns = computed(() => {
  if (!liveRun.value) return historyRuns.value
  return [liveRun.value, ...historyRuns.value.filter((run) => run.id !== liveRun.value?.id)]
})

async function loadHistory() {
  const workflowId = workflowStore.activeWorkflow?.metadata.id
  if (!workflowId) {
    historyRuns.value = []
    return
  }
  historyLoading.value = true
  try {
    historyRuns.value = await workflowsApi.getExecutions(workflowId, currentProfileId.value)
  } finally {
    historyLoading.value = false
  }
}

onMounted(loadHistory)
watch(() => workflowStore.activeWorkflow?.metadata.id, loadHistory)
watch(() => executionStore.workflowStatus, (status) => {
  if (status && status !== 'RUNNING') void loadHistory()
})
</script>

<template>
  <ExecutionRunExplorer
    class="execution-bottom-panel"
    :runs="visibleRuns"
    :workflow="workflowStore.activeWorkflow"
    :loading="historyLoading"
  />
</template>

<style scoped>
.execution-bottom-panel { height: 100%; min-height: 0; }
</style>
