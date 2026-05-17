<template>
  <div class="nop-shell">
    <!-- Header -->
    <div class="nop-header">
      <div class="nop-header-left">
        <div class="nop-status-icon" :class="`nop-status-icon--${nodeState?.status ?? 'idle'}`">
          <LucideIcon :name="statusIcon" :size="14" />
        </div>
        <div class="nop-header-text">
          <span class="nop-title">{{ statusLabel }}</span>
          <span class="nop-node-id">{{ nodeId }}</span>
        </div>
      </div>
      <span v-if="duration" class="nop-duration">{{ duration }}</span>
    </div>

    <!-- Body -->
    <div class="nop-body">
      <!-- Running state -->
      <div v-if="nodeState?.status === 'running'" class="nop-state-banner nop-state-banner--running">
        <LucideIcon name="loader-2" :size="14" class="nop-spin" />
        Running...
      </div>

      <!-- Success output -->
      <template v-else-if="nodeState?.status === 'success'">
        <div class="nop-state-banner nop-state-banner--success">
          <LucideIcon name="check-circle-2" :size="14" />
          Completed successfully
        </div>
        <JsonViewer v-if="nodeState.output !== undefined" :data="nodeState.output" title="Output" />
        <div v-else class="nop-empty">
          <LucideIcon name="circle-slash" :size="20" class="nop-empty-icon" />
          <p>No output returned</p>
        </div>
      </template>

      <!-- Failed state -->
      <template v-else-if="nodeState?.status === 'failed'">
        <div class="nop-state-banner nop-state-banner--failed">
          <LucideIcon name="x-circle" :size="14" />
          Execution failed
        </div>
        <div v-if="nodeState.error" class="nop-error-block">
          <pre class="nop-error-text">{{ nodeState.error }}</pre>
        </div>
      </template>

      <!-- Idle / no result -->
      <div v-else class="nop-empty">
        <LucideIcon name="eye-off" :size="24" class="nop-empty-icon" />
        <p>No execution result yet</p>
        <p class="nop-empty-sub">Run the workflow to see output here.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useExecutionStore } from '@/features/workflow-editor/stores/execution.store'
import JsonViewer from '@/shared/components/data-display/JsonViewer.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{ nodeId: string }>()

const executionStore = useExecutionStore()
const nodeState = computed(() => executionStore.nodeStatuses[props.nodeId])

const statusIcon = computed(() => {
  switch (nodeState.value?.status) {
    case 'running': return 'loader-2'
    case 'success': return 'check-circle-2'
    case 'failed':  return 'x-circle'
    default:        return 'eye-off'
  }
})

const statusLabel = computed(() => {
  switch (nodeState.value?.status) {
    case 'running': return 'Running'
    case 'success': return 'Output'
    case 'failed':  return 'Error'
    default:        return 'No Result'
  }
})

const duration = computed(() => {
  const s = nodeState.value
  if (!s?.startedAt || !s.endedAt) return null
  const secs = ((s.endedAt - s.startedAt) / 1000).toFixed(2)
  return `${secs}s`
})
</script>

<style scoped>
.nop-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ── Header ───────────────────────────────────────────────────── */

.nop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sailor-space-3) var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border);
  background-color: var(--sailor-bg-surface);
  flex-shrink: 0;
}

.nop-header-left {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-3);
}

.nop-status-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--sailor-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nop-status-icon--idle    { background: rgba(255, 255, 255, 0.05); color: var(--sailor-text-muted); }
.nop-status-icon--running { background: rgba(245, 158,  11, 0.15); color: var(--sailor-amber-400); }
.nop-status-icon--success { background: rgba( 52, 211, 153, 0.15); color: var(--sailor-green-400); }
.nop-status-icon--failed  { background: rgba(248, 113, 113, 0.15); color: var(--sailor-red-400);   }

.nop-header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nop-title {
  font-size: var(--sailor-text-sm);
  font-weight: 600;
  color: var(--sailor-text-primary);
}

.nop-node-id {
  font-size: var(--sailor-text-xs);
  font-family: var(--sailor-font-mono);
  color: var(--sailor-text-muted);
}

.nop-duration {
  font-size: var(--sailor-text-xs);
  font-family: var(--sailor-font-mono);
  color: var(--sailor-text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: var(--sailor-radius-sm);
  border: 1px solid var(--sailor-border);
}

/* ── Body ─────────────────────────────────────────────────────── */

.nop-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--sailor-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-3);
  background-color: var(--sailor-bg-canvas);
}

/* ── Status banners ───────────────────────────────────────────── */

.nop-state-banner {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-2) var(--sailor-space-3);
  border-radius: var(--sailor-radius-sm);
  font-size: var(--sailor-text-xs);
  font-weight: 600;
}

.nop-state-banner--running {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: var(--sailor-amber-400);
}

.nop-state-banner--success {
  background: rgba(52, 211, 153, 0.08);
  border: 1px solid rgba(52, 211, 153, 0.2);
  color: var(--sailor-green-400);
}

.nop-state-banner--failed {
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  color: var(--sailor-red-400);
}

/* ── Error block ──────────────────────────────────────────────── */

.nop-error-block {
  background: rgba(248, 113, 113, 0.05);
  border: 1px solid rgba(248, 113, 113, 0.15);
  border-radius: var(--sailor-radius-sm);
  padding: var(--sailor-space-3);
  overflow: auto;
  max-height: 300px;
}

.nop-error-text {
  margin: 0;
  font-family: var(--sailor-font-mono);
  font-size: var(--sailor-text-xs);
  color: var(--sailor-red-400);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ── Empty state ──────────────────────────────────────────────── */

.nop-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-10) var(--sailor-space-4);
  color: var(--sailor-text-muted);
  text-align: center;
}

.nop-empty-icon {
  opacity: 0.3;
}

.nop-empty p {
  font-size: var(--sailor-text-sm);
  margin: 0;
}

.nop-empty-sub {
  font-size: var(--sailor-text-xs);
  opacity: 0.6;
  margin: 0;
}

/* ── Spin animation ───────────────────────────────────────────── */

.nop-spin {
  animation: nop-spin 1s linear infinite;
}

@keyframes nop-spin {
  to { transform: rotate(360deg); }
}
</style>
