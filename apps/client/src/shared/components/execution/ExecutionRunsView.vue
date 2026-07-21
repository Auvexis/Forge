<script setup lang="ts">
import { computed } from 'vue'
import type { ExecutionLog } from '@/core/types/execution.types'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = withDefaults(defineProps<{
  runs: ExecutionLog[]
  loading?: boolean
}>(), { loading: false })

const emit = defineEmits<{ (event: 'select', runId: string): void }>()
const sortedRuns = computed(() => [...props.runs].sort((a, b) => b.startedAt - a.startedAt))

function statusClass(run: ExecutionLog) {
  return run.status.toLowerCase()
}

function duration(run: ExecutionLog) {
  if (run.endedAt === null) return 'Running'
  const value = Math.max(0, run.endedAt - run.startedAt)
  return value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(2)}s`
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(timestamp)
}
</script>

<template>
  <section class="execution-runs-view">
    <div v-if="props.loading" class="execution-runs-view__empty">Loading runs...</div>
    <div v-else-if="sortedRuns.length === 0" class="execution-runs-view__empty">
      <LucideIcon name="history" :size="18" />
      <span>No runs yet.</span>
    </div>
    <div v-else class="execution-runs-view__list">
      <BaseButton
        v-for="run in sortedRuns"
        :key="run.id"
        class="execution-runs-view__run"
        variant="ghost"
        type="button"
        @click="emit('select', run.id)"
      >
        <span class="execution-runs-view__status" :class="`is-${statusClass(run)}`" />
        <span class="execution-runs-view__copy">
          <strong>{{ run.status === 'RUNNING' ? 'Active run' : 'Workflow run' }}</strong>
          <small>{{ formatDate(run.startedAt) }}</small>
        </span>
        <code>{{ duration(run) }}</code>
        <span class="execution-runs-view__state">{{ run.status }}</span>
        <LucideIcon name="chevron-right" :size="14" />
      </BaseButton>
    </div>
  </section>
</template>

<style scoped>
.execution-runs-view { height: 100%; min-height: 0; display: flex; flex-direction: column; background: var(--fabric-execution-runs-bg); color: var(--fabric-execution-runs-text); }
.execution-runs-view__list { min-height: 0; overflow: auto; padding: var(--fabric-space-2); }
.execution-runs-view__run { width: 100%; min-height: 48px; border-radius: var(--fabric-radius-sm); }
.execution-runs-view__run :deep(.base-button__label) { width: 100%; display: grid; grid-template-columns: 8px minmax(0,1fr) auto 72px 16px; align-items: center; gap: var(--fabric-space-3); text-align: left; }
.execution-runs-view__status { width: 8px; height: 8px; border-radius: var(--fabric-radius-full); background-color: var(--fabric-execution-runs-status-bg); }
.execution-runs-view__status.is-success { background-color: var(--fabric-execution-runs-status-success-bg); }
.execution-runs-view__status.is-failed, .execution-runs-view__status.is-cancelled { background-color: var(--fabric-execution-runs-status-error-bg); }
.execution-runs-view__status.is-running { background-color: var(--fabric-execution-runs-status-running-bg); }
.execution-runs-view__copy { display: grid; min-width: 0; gap: 2px; }
.execution-runs-view__copy strong { color: var(--fabric-execution-runs-text); font-size: var(--fabric-text-xs); }
.execution-runs-view__copy small, .execution-runs-view__run code, .execution-runs-view__state { color: var(--fabric-execution-runs-muted-text); font-size: 10px; }
.execution-runs-view__run code { font-family: var(--fabric-font-mono); }
.execution-runs-view__state { font-weight: var(--fabric-font-semibold); }
.execution-runs-view__empty { height: 100%; display: flex; align-items: center; justify-content: center; gap: var(--fabric-space-2); color: var(--fabric-execution-runs-muted-text); font-size: var(--fabric-text-sm); }
</style>
