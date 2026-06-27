<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ExecutionLog } from '@/core/types/execution.types'
import type { WorkflowItem } from '@/core/types/workflow.types'
import { buildExecutionRunDetail } from './executionRunTreeModel.ts'
import ExecutionRunDetail from './ExecutionRunDetail.vue'
import ExecutionRunsView from './ExecutionRunsView.vue'

const props = withDefaults(defineProps<{
  runs: ExecutionLog[]
  workflow: WorkflowItem | null
  loading?: boolean
}>(), { loading: false })

const selectedRunId = ref<string | null>(null)
const selectedRun = computed(() => props.runs.find((run) => run.id === selectedRunId.value) ?? null)
const selectedDetail = computed(() => selectedRun.value ? buildExecutionRunDetail({ workflow: props.workflow, run: selectedRun.value }) : null)

watch(() => props.runs, (runs) => {
  if (selectedRunId.value && !runs.some((run) => run.id === selectedRunId.value)) selectedRunId.value = null
})
</script>

<template>
  <div class="execution-run-explorer">
    <ExecutionRunsView :runs="props.runs" :loading="props.loading" @select="selectedRunId = $event" />
    <Transition name="execution-run-slide">
      <ExecutionRunDetail v-if="selectedDetail" class="execution-run-explorer__detail" :detail="selectedDetail" @back="selectedRunId = null" />
    </Transition>
  </div>
</template>

<style scoped>
.execution-run-explorer { position: relative; height: 100%; min-height: 0; overflow: hidden; }
.execution-run-explorer__detail { position: absolute; inset: 0; z-index: 1; box-shadow: -12px 0 28px color-mix(in srgb, var(--sailor-bg-base) 55%, transparent); }
.execution-run-slide-enter-active { transition: transform var(--sailor-duration-slow) var(--sailor-ease-decelerate), opacity var(--sailor-duration-base) var(--sailor-ease-standard); }
.execution-run-slide-leave-active { transition: transform var(--sailor-duration-base) var(--sailor-ease-accelerate), opacity var(--sailor-duration-fast) var(--sailor-ease-standard); }
.execution-run-slide-enter-from, .execution-run-slide-leave-to { opacity: 0; transform: translateX(100%); }
</style>
