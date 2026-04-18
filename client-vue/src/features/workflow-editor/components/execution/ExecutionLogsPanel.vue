<template>
  <div
    class="elp-panel"
    :style="panelStyle"
    @click.stop
    @mousedown.stop
  >
    <!-- Header — drag handle -->
    <div
      class="elp-header elp-header--draggable"
      @pointerdown.stop="startDrag"
    >
      <div class="elp-header-left">
        <button v-if="detailExecution" class="elp-back-btn" @click="detailExecution = null">
          <LucideIcon name="chevron-left" :size="16" />
        </button>
        <div class="elp-header-text">
          <span class="elp-title">{{
            detailExecution ? 'Execution Detail' : 'Execution Logs'
          }}</span>
          <span v-if="!detailExecution" class="elp-subtitle"
            >{{ executions?.length ?? 0 }} runs</span
          >
        </div>
      </div>
      <div class="elp-header-actions">
        <button
          v-if="!detailExecution"
          class="elp-icon-btn"
          title="Clear all logs"
          :disabled="clearLoading || !executions?.length"
          @click="handleClear"
        >
          <LucideIcon name="trash-2" :size="14" />
        </button>
        <button class="elp-icon-btn" title="Refresh" :disabled="loading" @click="refresh">
          <LucideIcon name="refresh-cw" :size="14" :class="{ 'elp-spin': loading }" />
        </button>
        <button class="elp-icon-btn" title="Close" @click="$emit('close')">
          <LucideIcon name="x" :size="16" />
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && !executions" class="elp-loading">
      <LucideIcon name="loader-2" :size="20" class="elp-spin" />
      <span>Loading...</span>
    </div>

    <!-- LIST VIEW -->
    <template v-else-if="!detailExecution">
      <div v-if="!executions?.length" class="elp-empty">
        <LucideIcon name="database" :size="24" class="elp-empty-icon" />
        <p>No executions yet</p>
        <p class="elp-empty-sub">Run the workflow to see logs here.</p>
      </div>
      <div v-else class="elp-list">
        <button
          v-for="exec in executions"
          :key="exec.id"
          class="elp-row"
          @click="detailExecution = exec"
          @mousedown.stop
        >
          <div class="elp-row-icon" :class="`elp-row-icon--${exec.status.toLowerCase()}`">
            <LucideIcon :name="statusIcon(exec.status)" :size="13" />
          </div>
          <div class="elp-row-info">
            <span class="elp-row-date">{{ formatDate(exec.startedAt) }}</span>
            <span class="elp-row-id">{{ exec.id.slice(-8) }}</span>
          </div>
          <div class="elp-row-right">
            <span class="elp-badge" :class="`elp-badge--${exec.status.toLowerCase()}`">
              {{ exec.status }}
            </span>
            <span v-if="exec.endedAt" class="elp-row-duration">
              {{ formatDuration(exec.startedAt, exec.endedAt) }}
            </span>
          </div>
          <LucideIcon name="chevron-right" :size="14" class="elp-row-arrow" />
        </button>
      </div>
    </template>

    <!-- DETAIL VIEW -->
    <template v-else>
      <div class="elp-detail">
        <!-- Status banner -->
        <div
          class="elp-detail-banner"
          :class="`elp-detail-banner--${detailExecution.status.toLowerCase()}`"
        >
          <LucideIcon :name="statusIcon(detailExecution.status)" :size="14" />
          <span>{{ detailExecution.status }}</span>
          <span v-if="detailExecution.endedAt" class="elp-detail-duration">
            {{ formatDuration(detailExecution.startedAt, detailExecution.endedAt) }}
          </span>
          <span class="elp-detail-date">{{ formatDate(detailExecution.startedAt) }}</span>
        </div>

        <!-- Trigger payload -->
        <div v-if="detailExecution.context.trigger" class="elp-section">
          <div class="elp-section-title-row">
            <p class="elp-section-title">Trigger Payload</p>
            <button
              class="elp-copy-btn"
              :title="triggerCopied ? 'Copied!' : 'Copy payload'"
              @click.stop="copyTriggerPayload"
            >
              <LucideIcon :name="triggerCopied ? 'check' : 'copy'" :size="12" />
            </button>
          </div>
          <pre class="elp-code">{{ formatJson(detailExecution.context.trigger) }}</pre>
        </div>

        <!-- Steps -->
        <div v-if="detailExecution.context.steps" class="elp-section">
          <p class="elp-section-title">Steps</p>
          <div class="elp-steps">
            <div
              v-for="(step, nodeId) in detailExecution.context.steps"
              :key="nodeId"
              class="elp-step"
              :class="step ? `elp-step--${step.status.toLowerCase()}` : ''"
            >
              <div class="elp-step-header">
                <LucideIcon :name="stepStatusIcon(step?.status ?? '')" :size="12" />
                <span class="elp-step-id">{{ nodeId }}</span>
                <span class="elp-step-status">{{ step?.status }}</span>
              </div>
              <pre v-if="step?.error" class="elp-step-error">{{ step.error }}</pre>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { workflowsApi } from '@/core/api/workflows.api'
import { useApi } from '@/shared/composables/useApi'
import { useToast } from '@/shared/composables/useToast'
import type { ExecutionLog, WorkflowExecutionStatus } from '@/core/types/execution.types'

const props = defineProps<{ workflowId: string }>()
defineEmits<{ (e: 'close'): void }>()

const { data: executions, loading, execute: fetchExecutions } = useApi(workflowsApi.getExecutions)
const clearLoading = ref(false)
const detailExecution = ref<ExecutionLog | null>(null)
const { error: toastError, success: toastSuccess } = useToast()

async function refresh() {
  await fetchExecutions(props.workflowId)
}

async function handleClear() {
  if (!executions.value?.length) return
  clearLoading.value = true
  try {
    await workflowsApi.clearExecutions(props.workflowId)
    toastSuccess('Execution logs cleared')
    await refresh()
    detailExecution.value = null
  } catch {
    toastError('Failed to clear logs')
  } finally {
    clearLoading.value = false
  }
}

function statusIcon(status: WorkflowExecutionStatus | string): string {
  switch (status) {
    case 'SUCCESS':
      return 'check-circle-2'
    case 'FAILED':
      return 'x-circle'
    case 'RUNNING':
      return 'loader-2'
    case 'CANCELLED':
      return 'slash'
    default:
      return 'circle'
  }
}

function stepStatusIcon(status: string): string {
  switch (status.toUpperCase()) {
    case 'SUCCESS':
      return 'check'
    case 'FAILED':
      return 'x'
    case 'RUNNING':
      return 'loader-2'
    default:
      return 'minus'
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString()
}

function formatDuration(start: number, end: number): string {
  return `${((end - start) / 1000).toFixed(2)}s`
}

function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

const triggerCopied = ref(false)

async function copyTriggerPayload() {
  if (!detailExecution.value?.context.trigger) return
  try {
    await navigator.clipboard.writeText(formatJson(detailExecution.value.context.trigger))
    triggerCopied.value = true
    setTimeout(() => (triggerCopied.value = false), 1500)
  } catch {
    toastError('Failed to copy to clipboard')
  }
}

watch(() => props.workflowId, refresh)
onMounted(refresh)

// ── Draggable panel ──────────────────────────────────────────────────────────

const dragOffset = ref({ x: 0, y: 0 })
let dragging = false
let startX = 0
let startY = 0
let originX = 0
let originY = 0

const panelStyle = computed(() => ({
  transform: `translate(${dragOffset.value.x}px, ${dragOffset.value.y}px)`,
}))

function startDrag(event: PointerEvent) {
  // Only drag with primary button; ignore clicks on inner buttons
  if (event.button !== 0) return
  const target = event.target as HTMLElement
  // Don't initiate drag when clicking an interactive element inside the header
  if (target.closest('button')) return

  dragging = true
  startX = event.clientX
  startY = event.clientY
  originX = dragOffset.value.x
  originY = dragOffset.value.y

  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', stopDrag, { once: true })
}

function onDrag(event: PointerEvent) {
  if (!dragging) return
  dragOffset.value = {
    x: originX + event.clientX - startX,
    y: originY + event.clientY - startY,
  }
}

function stopDrag() {
  dragging = false
  window.removeEventListener('pointermove', onDrag)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', stopDrag)
})
</script>

<style scoped>
.elp-panel {
  width: 440px;
  max-height: 580px;
  background-color: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  /* Re-enable events: the wrapper has pointer-events:none to avoid ghost
     bounding-box blocking the canvas after dragging the panel away. */
  pointer-events: auto;
}

/* ── Header ───────────────────────────────────────────────────── */

.elp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nod8-space-3) var(--nod8-space-4);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.elp-header--draggable {
  cursor: grab;
  user-select: none;
}

.elp-header--draggable:active {
  cursor: grabbing;
}

.elp-header-left {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
}

.elp-header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.elp-title {
  font-size: var(--nod8-text-sm);
  font-weight: 600;
  color: var(--nod8-text-primary);
}

.elp-subtitle {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
}

.elp-header-actions {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-1);
}

.elp-back-btn,
.elp-icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nod8-radius-sm);
  background: transparent;
  border: none;
  color: var(--nod8-text-muted);
  cursor: pointer;
  transition: all var(--nod8-duration-fast);
}

.elp-back-btn:hover,
.elp-icon-btn:hover {
  background: var(--nod8-bg-elevated);
  color: var(--nod8-text-primary);
}

.elp-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Loading ──────────────────────────────────────────────────── */

.elp-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-8);
  font-size: var(--nod8-text-sm);
  color: var(--nod8-text-muted);
}

/* ── Empty state ──────────────────────────────────────────────── */

.elp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-10) var(--nod8-space-4);
  color: var(--nod8-text-muted);
  text-align: center;
}

.elp-empty-icon {
  opacity: 0.3;
}

.elp-empty p {
  font-size: var(--nod8-text-sm);
  margin: 0;
}

.elp-empty-sub {
  font-size: var(--nod8-text-xs);
  opacity: 0.6;
}

/* ── List view ────────────────────────────────────────────────── */

.elp-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.elp-row {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-3) var(--nod8-space-4);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--nod8-border-muted);
  cursor: pointer;
  text-align: left;
  transition: background-color var(--nod8-duration-fast);
  width: 100%;
}

.elp-row:hover {
  background-color: var(--nod8-bg-elevated);
}

.elp-row-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.elp-row-icon--success {
  background: rgba(52, 211, 153, 0.12);
  color: var(--nod8-green-400);
}
.elp-row-icon--failed {
  background: rgba(248, 113, 113, 0.12);
  color: var(--nod8-red-400);
}
.elp-row-icon--running {
  background: rgba(245, 158, 11, 0.12);
  color: var(--nod8-amber-400);
}
.elp-row-icon--cancelled {
  background: rgba(255, 255, 255, 0.05);
  color: var(--nod8-text-muted);
}

.elp-row-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.elp-row-date {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-primary);
}

.elp-row-id {
  font-size: 10px;
  font-family: var(--nod8-font-mono);
  color: var(--nod8-text-muted);
}

.elp-row-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.elp-row-duration {
  font-size: 10px;
  font-family: var(--nod8-font-mono);
  color: var(--nod8-text-muted);
}

.elp-row-arrow {
  color: var(--nod8-text-muted);
  flex-shrink: 0;
}

/* ── Badge ────────────────────────────────────────────────────── */

.elp-badge {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 5px;
  border-radius: 4px;
}

.elp-badge--success {
  background: rgba(52, 211, 153, 0.12);
  color: var(--nod8-green-400);
}
.elp-badge--failed {
  background: rgba(248, 113, 113, 0.12);
  color: var(--nod8-red-400);
}
.elp-badge--running {
  background: rgba(245, 158, 11, 0.12);
  color: var(--nod8-amber-400);
}
.elp-badge--cancelled {
  background: rgba(255, 255, 255, 0.05);
  color: var(--nod8-text-muted);
}

/* ── Detail view ──────────────────────────────────────────────── */

.elp-detail {
  flex: 1;
  overflow-y: auto;
  padding: var(--nod8-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-4);
}

.elp-detail-banner {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-2) var(--nod8-space-3);
  border-radius: var(--nod8-radius-sm);
  font-size: var(--nod8-text-xs);
  font-weight: 600;
}

.elp-detail-banner--success {
  background: rgba(52, 211, 153, 0.08);
  border: 1px solid rgba(52, 211, 153, 0.2);
  color: var(--nod8-green-400);
}
.elp-detail-banner--failed {
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  color: var(--nod8-red-400);
}
.elp-detail-banner--running {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: var(--nod8-amber-400);
}
.elp-detail-banner--cancelled {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--nod8-border);
  color: var(--nod8-text-muted);
}

.elp-detail-duration,
.elp-detail-date {
  margin-left: auto;
  font-weight: 400;
  opacity: 0.7;
}

.elp-detail-date {
  font-size: 10px;
}

/* ── Sections ─────────────────────────────────────────────────── */

.elp-section {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

.elp-section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.elp-section-title {
  font-size: var(--nod8-text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--nod8-text-muted);
  margin: 0;
}

.elp-copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--nod8-radius-sm);
  background: transparent;
  border: none;
  color: var(--nod8-text-muted);
  cursor: pointer;
  transition: all var(--nod8-duration-fast);
  flex-shrink: 0;
}

.elp-copy-btn:hover {
  background: var(--nod8-bg-elevated);
  color: var(--nod8-text-primary);
}

.elp-code {
  margin: 0;
  padding: var(--nod8-space-3);
  background: var(--nod8-bg-canvas);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  font-family: var(--nod8-font-mono);
  font-size: var(--nod8-text-xs);
  color: var(--nod8-green-400);
  overflow: auto;
  max-height: 150px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

/* ── Steps ────────────────────────────────────────────────────── */

.elp-steps {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

.elp-step {
  padding: var(--nod8-space-2) var(--nod8-space-3);
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-border-muted);
  background: var(--nod8-bg-elevated);
}

.elp-step--failed {
  border-color: rgba(248, 113, 113, 0.2);
  background: rgba(248, 113, 113, 0.04);
}
.elp-step--success {
  border-color: rgba(52, 211, 153, 0.15);
}

.elp-step-header {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
}

.elp-step-id {
  font-size: var(--nod8-text-xs);
  font-family: var(--nod8-font-mono);
  color: var(--nod8-text-primary);
  flex: 1;
}

.elp-step-status {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--nod8-text-muted);
}

.elp-step--failed .elp-step-status {
  color: var(--nod8-red-400);
}
.elp-step--success .elp-step-status {
  color: var(--nod8-green-400);
}

.elp-step-error {
  margin: var(--nod8-space-2) 0 0;
  font-family: var(--nod8-font-mono);
  font-size: 10px;
  color: var(--nod8-red-400);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
}

/* ── Spin animation ───────────────────────────────────────────── */

.elp-spin {
  animation: elp-spin 1s linear infinite;
}

@keyframes elp-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
