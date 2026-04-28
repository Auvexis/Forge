<template>
  <div class="pm-panel">

    <!-- ── Header actions ── -->
    <div class="pm-toolbar">
      <span class="pm-count">
        {{ items.length }} workflow{{ items.length !== 1 ? 's' : '' }} in production
      </span>
      <button class="pm-refresh-btn" :class="{ 'pm-refresh-btn--spinning': loading }" @click="refresh" title="Refresh">
        <RefreshCwIcon :size="14" />
      </button>
    </div>

    <!-- ── Empty state ── -->
    <div v-if="!loading && items.length === 0" class="pm-empty">
      <ActivityIcon :size="32" class="pm-empty__icon" />
      <p class="pm-empty__title">No workflows in production</p>
      <p class="pm-empty__hint">Publish a workflow from the editor to see it here.</p>
    </div>

    <!-- ── Workflow cards ── -->
    <div v-else class="pm-list">
      <div v-for="item in items" :key="item.id" class="pm-card">

        <!-- Card header -->
        <div class="pm-card__header">
          <div class="pm-card__title-row">
            <span class="pm-card__name">{{ item.name }}</span>
            <span class="pm-badge" :class="`pm-badge--${item.triggerType}`">
              {{ triggerLabel(item.triggerType) }}
            </span>
          </div>

          <!-- Unpublish button -->
          <button
            class="pm-unpublish-btn"
            :disabled="unpublishing === item.id"
            @click="handleUnpublish(item)"
            title="Remove from production"
          >
            <LoaderIcon v-if="unpublishing === item.id" :size="12" class="pm-spin" />
            <PowerOffIcon v-else :size="12" />
          </button>
        </div>

        <!-- Last execution -->
        <div class="pm-card__exec" v-if="item.lastExecution">
          <span
            class="pm-exec-dot"
            :class="{
              'pm-exec-dot--success': item.lastExecution.status === 'success',
              'pm-exec-dot--error': item.lastExecution.status === 'error' || item.lastExecution.status === 'failed',
              'pm-exec-dot--running': item.lastExecution.status === 'running',
            }"
          />
          <span class="pm-exec-label">
            {{ execLabel(item.lastExecution.status) }}
          </span>
          <span class="pm-exec-time">· {{ relativeTime(item.lastExecution.startTime) }}</span>
        </div>
        <div class="pm-card__exec pm-card__exec--none" v-else>
          <span class="pm-exec-label">No executions yet</span>
        </div>

        <!-- Published since -->
        <div class="pm-card__published" v-if="item.publishedAt">
          Published {{ relativeTime(new Date(item.publishedAt).getTime()) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RefreshCwIcon, ActivityIcon, PowerOffIcon, LoaderIcon } from 'lucide-vue-next'
import { workflowsApi, type ProductionWorkflowStatus } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'

const toast = useToast()
const items = ref<ProductionWorkflowStatus[]>([])
const loading = ref(false)
const unpublishing = ref<string | null>(null)

let pollInterval: ReturnType<typeof setInterval> | null = null

async function refresh() {
  loading.value = true
  try {
    items.value = await workflowsApi.getProductionStatus()
  } catch (err: any) {
    toast.error(err?.message ?? 'Failed to load production status')
  } finally {
    loading.value = false
  }
}

async function handleUnpublish(item: ProductionWorkflowStatus) {
  unpublishing.value = item.id
  try {
    await workflowsApi.unpublish(item.id)
    toast.success(`"${item.name}" removed from production`)
    await refresh()
  } catch (err: any) {
    toast.error(err?.message ?? 'Failed to unpublish')
  } finally {
    unpublishing.value = null
  }
}

function triggerLabel(type: ProductionWorkflowStatus['triggerType']): string {
  const map: Record<string, string> = {
    webhook: '⚡ Webhook',
    cron: '⏰ Cron',
    event: '📡 Event',
    manual: '▶ Manual',
  }
  return map[type] ?? type
}

function execLabel(status: string): string {
  const map: Record<string, string> = {
    success: 'Success',
    error: 'Error',
    failed: 'Failed',
    running: 'Running',
  }
  return map[status] ?? status
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

onMounted(() => {
  refresh()
  pollInterval = setInterval(refresh, 5_000)
})

onUnmounted(() => {
  if (pollInterval !== null) clearInterval(pollInterval)
})
</script>

<style scoped>
.pm-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
  overflow: hidden;
}

/* ── Toolbar ─────────────────────────────────────────────────── */
.pm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nod8-space-3) var(--nod8-space-4);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.pm-count {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-weight: var(--nod8-font-medium);
}

.pm-refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-text-secondary);
  transition: all var(--nod8-duration-fast);
}

.pm-refresh-btn:hover {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
}

.pm-refresh-btn--spinning svg {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ── List ────────────────────────────────────────────────────── */
.pm-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--nod8-space-2);
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

/* ── Card ────────────────────────────────────────────────────── */
.pm-card {
  background: var(--nod8-bg-elevated);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-md);
  padding: var(--nod8-space-3);
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: border-color var(--nod8-duration-fast);
}

.pm-card:hover {
  border-color: var(--nod8-border-hover, var(--nod8-border));
}

.pm-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nod8-space-2);
}

.pm-card__title-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pm-card__name {
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Trigger badge ───────────────────────────────────────────── */
.pm-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--nod8-radius-sm);
  width: fit-content;
}

.pm-badge--webhook {
  background: color-mix(in srgb, var(--nod8-accent) 15%, transparent);
  color: var(--nod8-accent);
}

.pm-badge--cron {
  background: color-mix(in srgb, #a78bfa 15%, transparent);
  color: #a78bfa;
}

.pm-badge--event {
  background: color-mix(in srgb, #38bdf8 15%, transparent);
  color: #38bdf8;
}

.pm-badge--manual {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-secondary);
}

/* ── Unpublish button ────────────────────────────────────────── */
.pm-unpublish-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-text-muted);
  flex-shrink: 0;
  transition: all var(--nod8-duration-fast);
}

.pm-unpublish-btn:hover:not(:disabled) {
  background: color-mix(in srgb, #ef4444 15%, transparent);
  color: #ef4444;
}

.pm-unpublish-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pm-spin {
  animation: spin 0.8s linear infinite;
}

/* ── Execution status ────────────────────────────────────────── */
.pm-card__exec {
  display: flex;
  align-items: center;
  gap: 5px;
}

.pm-card__exec--none {
  opacity: 0.5;
}

.pm-exec-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--nod8-text-muted);
}

.pm-exec-dot--success { background: var(--nod8-green-500); }
.pm-exec-dot--error   { background: var(--nod8-red-500); }
.pm-exec-dot--running {
  background: var(--nod8-amber-500);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.pm-exec-label {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-secondary);
  font-weight: var(--nod8-font-medium);
}

.pm-exec-time {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
}

.pm-card__published {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  margin-top: 2px;
}

/* ── Empty state ─────────────────────────────────────────────── */
.pm-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-8);
  text-align: center;
}

.pm-empty__icon {
  color: var(--nod8-text-muted);
  opacity: 0.4;
}

.pm-empty__title {
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-text-secondary);
}

.pm-empty__hint {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  max-width: 200px;
  line-height: 1.5;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
