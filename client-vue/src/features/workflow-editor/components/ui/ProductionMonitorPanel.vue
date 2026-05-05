<template>
  <div class="pm-panel">
    <!-- ── Header actions ── -->
    <div class="pm-toolbar">
      <span class="pm-count">
        {{ items.length }} workflow{{ items.length !== 1 ? 's' : '' }} in production
      </span>
      <button
        class="pm-refresh-btn"
        :class="{ 'pm-refresh-btn--spinning': loading }"
        @click="refresh"
        title="Refresh"
      >
        <RefreshCwIcon :size="14" />
      </button>
    </div>

    <!-- ── Empty state ── -->
    <div v-if="items.length === 0" class="pm-empty">
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

        </div>

        <!-- Last execution -->
        <div class="pm-card__exec" v-if="item.lastExecution">
          <span
            class="pm-exec-dot"
            :class="{
              'pm-exec-dot--success': item.lastExecution.status === 'SUCCESS',
              'pm-exec-dot--error':
                item.lastExecution.status === 'ERROR' || item.lastExecution.status === 'FAILED',
              'pm-exec-dot--running': item.lastExecution.status === 'RUNNING',
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
import { RefreshCwIcon, ActivityIcon, LoaderIcon } from 'lucide-vue-next'
import { workflowsApi, type ProductionWorkflowStatus } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'

const toast = useToast()
const items = ref<ProductionWorkflowStatus[]>([])
const loading = ref(false)

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
  pollInterval = setInterval(refresh, 1_000)
})

onUnmounted(() => {
  if (pollInterval !== null) clearInterval(pollInterval)
})
</script>
