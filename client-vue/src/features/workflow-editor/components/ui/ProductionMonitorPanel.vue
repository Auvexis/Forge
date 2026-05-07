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

        <!-- Last execution — clickable to expand details -->
        <button
          v-if="item.lastExecution"
          class="pm-card__exec pm-card__exec--btn"
          :class="{ 'pm-card__exec--open': expandedId === item.id }"
          @click="toggleExpand(item.id)"
        >
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
          <ChevronDownIcon
            :size="12"
            class="pm-exec-chevron"
            :class="{ 'pm-exec-chevron--open': expandedId === item.id }"
          />
        </button>
        <div class="pm-card__exec pm-card__exec--none" v-else>
          <span class="pm-exec-label">No executions yet</span>
        </div>

        <!-- Expandable details dropdown -->
        <Transition name="pm-expand">
          <div
            v-if="expandedId === item.id"
            class="pm-details"
          >
            <!-- Loading details -->
            <div v-if="detailLoading[item.id]" class="pm-details__loading">
              <LoaderIcon :size="12" class="pm-spin" />
              <span>Loading...</span>
            </div>

            <template v-else-if="execDetails[item.id]?.steps">
              <div
                v-for="(step, nodeId) in execDetails[item.id]!.steps"
                :key="nodeId"
                class="pm-step"
              >
                <button
                  class="pm-step__header"
                  @click="toggleStep(item.id, nodeId as string)"
                >
                  <ChevronRightIcon
                    :size="10"
                    class="pm-step__chevron"
                    :class="{ 'pm-step__chevron--open': isStepOpen(item.id, nodeId as string) }"
                  />
                  <span
                    class="pm-step__dot"
                    :class="{
                      'pm-step__dot--success': step?.status === 'SUCCESS',
                      'pm-step__dot--error': step?.status === 'FAILED',
                    }"
                  />
                  <span class="pm-step__id">{{ nodeId }}</span>
                  <span class="pm-step__status">{{ step?.status ?? '—' }}</span>
                </button>

                <div v-if="isStepOpen(item.id, nodeId as string)" class="pm-step__body">
                  <pre v-if="step?.error" class="pm-step__code pm-step__code--error">{{ typeof step.error === 'string' ? step.error : JSON.stringify(step.error, null, 2) }}</pre>
                  <pre v-else-if="step?.output" class="pm-step__code">{{ formatJson(step.output) }}</pre>
                  <span v-else class="pm-step__empty">No output data.</span>
                </div>
              </div>
            </template>

            <div v-else class="pm-details__empty">
              No step data available for this execution.
            </div>
          </div>
        </Transition>

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
import { RefreshCwIcon, ActivityIcon, LoaderIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-vue-next'
import { workflowsApi, type ProductionWorkflowStatus } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'

const toast = useToast()
const items = ref<ProductionWorkflowStatus[]>([])
const loading = ref(false)

// ── Expandable details state ──────────────────────────────────
const expandedId = ref<string | null>(null)
const execDetails = ref<Record<string, { steps?: Record<string, any> } | null>>({})
const detailLoading = ref<Record<string, boolean>>({})
const expandedStepsMap = ref<Record<string, Set<string>>>({})

function isStepOpen(workflowId: string, nodeId: string): boolean {
  return expandedStepsMap.value[workflowId]?.has(nodeId) ?? false
}

function toggleStep(workflowId: string, nodeId: string) {
  if (!expandedStepsMap.value[workflowId]) {
    expandedStepsMap.value[workflowId] = new Set()
  }
  const set = expandedStepsMap.value[workflowId]
  if (set.has(nodeId)) {
    set.delete(nodeId)
  } else {
    set.add(nodeId)
  }
  // Force reactivity update
  expandedStepsMap.value = { ...expandedStepsMap.value }
}

async function loadDetails(id: string) {
  detailLoading.value[id] = true
  try {
    const executions = await workflowsApi.getExecutions(id)
    const last = executions[0]
    execDetails.value[id] = last?.context ?? null
  } catch {
    execDetails.value[id] = null
  } finally {
    detailLoading.value[id] = false
  }
}

async function toggleExpand(id: string) {
  if (expandedId.value === id) {
    expandedId.value = null
    return
  }
  expandedId.value = id
  await loadDetails(id)
}

// ── Helpers ───────────────────────────────────────────────────
function formatJson(data: any): string {
  try { return JSON.stringify(data, null, 2) } catch { return String(data) }
}

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

async function autoRefresh() {
  if (expandedId.value) return // Disable auto-refresh when details are open to prevent jump
  await refresh()
}

function triggerLabel(type: ProductionWorkflowStatus['triggerType']): string {
  const map: Record<string, string> = {
    webhook: '⚡ Webhook',
    cron: '⏰ Cron',
    event: '📡 Event',
    manual: '▶ Manual',
    plugin: '🔌 Plugin',
  }
  return map[type] ?? type
}

function execLabel(status: string): string {
  const map: Record<string, string> = {
    SUCCESS: 'Success',
    ERROR: 'Error',
    FAILED: 'Failed',
    RUNNING: 'Running',
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
  pollInterval = setInterval(autoRefresh, 5_000)
})

onUnmounted(() => {
  if (pollInterval !== null) clearInterval(pollInterval)
})
</script>
