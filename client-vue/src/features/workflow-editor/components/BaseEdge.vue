<template>
  <!-- ── Edge path ── -->
  <BaseEdge
    :id="id"
    :style="computedStyle"
    :path="pathData[0]"
    :marker-end="props.selected ? 'url(#nod8-arrow-selected)' : `url(#nod8-arrow-${edgeStatus})`"
  />

  <!-- ── Floating elements ── -->
  <EdgeLabelRenderer>
    <!-- Toolbar ABOVE the edge midpoint -->
    <div
      class="nodrag nopan nod8-edge-toolbar"
      :class="{ 'nod8-edge-toolbar--visible': !isMultiSelection && (isHovered || selected) }"
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-50%, calc(-100% - 14px)) translate(${pathData[1]}px,${pathData[2]}px) scale(${toolbarScale})`,
        transformOrigin: 'center bottom',
      }"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <!-- Quick-add between nodes -->
      <button class="nod8-edge-btn" @click.stop="onQuickAdd" title="Insert node here">
        <LucideIcon name="plus" :size="13" />
      </button>

      <!-- Edit label -->
      <template v-if="isEditingLabel">
        <input
          ref="labelInputRef"
          class="nod8-edge-label-input"
          v-model="labelDraft"
          placeholder="Label…"
          @keydown.enter.stop="commitLabel"
          @keydown.escape.stop="cancelLabel"
          @blur="commitLabel"
        />
      </template>
      <button v-else class="nod8-edge-btn" @click.stop="startEditLabel" title="Edit label">
        <LucideIcon name="tag" :size="13" />
      </button>

      <!-- Delete -->
      <button class="nod8-edge-btn nod8-edge-btn--danger" @click.stop="onDelete" title="Delete connection">
        <LucideIcon name="trash" :size="13" />
      </button>
    </div>

    <!-- Invisible wider hover zone spanning toolbar + label area -->
    <div
      class="nodrag nopan nod8-edge-hover-zone"
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${pathData[1]}px,${pathData[2]}px)`,
      }"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    />

    <!-- Label BELOW the edge midpoint -->
    <div
      v-if="edgeLabel"
      class="nodrag nopan nod8-edge-label"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, 14px) translate(${pathData[1]}px,${pathData[2]}px)`,
        pointerEvents: 'none',
      }"
    >
      {{ edgeLabel }}
    </div>
  </EdgeLabelRenderer>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { BaseEdge, EdgeLabelRenderer, useVueFlow } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useExecutionStore } from '../stores/execution.store'
import { routedBezierPath } from '../composables/useEdgeRouting'
import { useEventBus } from '@/shared/composables/useEventBus'

const props = defineProps<EdgeProps>()

const { removeEdges, getNodes, getSelectedNodes, viewport } = useVueFlow()
const executionStore = useExecutionStore()

const isMultiSelection = computed(() => getSelectedNodes.value.length >= 2)
const toolbarScale = computed(() => {
  const zoom = viewport.value.zoom || 1
  return Math.min(2, Math.max(1, 1 / zoom))
})

// ── Path ─────────────────────────────────────────────────────────────────────

const pathData = computed(() => {
  const [path, lx, ly] = routedBezierPath(
    props.sourceX, props.sourceY,
    props.targetX, props.targetY,
    props.sourcePosition,
    props.targetPosition,
    getNodes.value,
    [props.source, props.target],
  )
  return [path, lx, ly] as [string, number, number]
})

// ── Execution status / colors ─────────────────────────────────────────────────

const edgeStatus = computed(() => {
  let sStatus: string

  if (props.source === 'trigger') {
    const triggerNodeStatus = executionStore.nodeStatuses['trigger']?.status
    if (triggerNodeStatus && triggerNodeStatus !== 'idle') {
      sStatus = triggerNodeStatus
    } else if (executionStore.workflowStatus === 'SUCCESS') {
      sStatus = 'success'
    } else {
      sStatus = 'idle'
    }
  } else {
    sStatus = executionStore.nodeStatuses[props.source]?.status || 'idle'
  }

  const tNodeState = executionStore.nodeStatuses[props.target]
  const tStatus = tNodeState?.status || 'idle'

  if (sStatus === 'idle') return 'idle'

  if (sStatus === 'success') {
    const sOutput = executionStore.nodeStatuses[props.source]?.output as any
    if (sOutput && typeof sOutput === 'object') {
      if ('branch' in sOutput) {
        const actualHandle = props.sourceHandleId || 'then'
        if (sOutput.branch !== actualHandle) return 'idle'
      } else if ('activeHandle' in sOutput) {
        if (sOutput.activeHandle !== props.sourceHandleId) return 'idle'
      }
    }
  }

  if (tStatus !== 'idle') return tStatus
  if (sStatus === 'success') return 'success'
  return 'idle'
})

const strokeColor = computed(() => {
  if (props.selected) return 'var(--nod8-rf-edge-stroke-selected)'
  switch (edgeStatus.value) {
    case 'success': return 'var(--nod8-green-500, #22c55e)'
    case 'failed':  return 'var(--nod8-red-500, #ef4444)'
    case 'running': return 'var(--nod8-amber-500, #f59e0b)'
    default:        return 'var(--nod8-rf-edge-stroke)'
  }
})

const computedStyle = computed(() => ({
  ...props.style,
  stroke: strokeColor.value,
  strokeWidth: edgeStatus.value !== 'idle' ? 3 : 2,
  transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
}))

// ── Hover state ───────────────────────────────────────────────────────────────

const isHovered = ref(false)

// ── Delete ────────────────────────────────────────────────────────────────────

function onDelete() {
  removeEdges(props.id)
}

// ── Quick-add between nodes ───────────────────────────────────────────────────

const quickAddBetweenBus = useEventBus('edge:quick-add-between')

function onQuickAdd() {
  quickAddBetweenBus.emit({
    edgeId: props.id,
    sourceId: props.source,
    targetId: props.target,
    sourceHandle: props.sourceHandleId ?? props.data?.sourceHandle,
    targetHandle: props.targetHandleId ?? props.data?.targetHandle,
  })
}

// ── Label editing ─────────────────────────────────────────────────────────────

const edgeLabel      = computed(() => props.label as string | undefined)
const isEditingLabel = ref(false)
const labelDraft     = ref('')
const labelInputRef  = ref<HTMLInputElement | null>(null)

const edgeUpdateBus = useEventBus('edge:update-label')

function startEditLabel() {
  labelDraft.value = edgeLabel.value ?? ''
  isEditingLabel.value = true
  nextTick(() => labelInputRef.value?.focus())
}

function commitLabel() {
  if (!isEditingLabel.value) return
  isEditingLabel.value = false
  edgeUpdateBus.emit({ edgeId: props.id, label: labelDraft.value.trim() })
}

function cancelLabel() {
  isEditingLabel.value = false
}
</script>

<style scoped>
/* ── Toolbar (above midpoint) ────────────────────────────────────── */
.nod8-edge-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 2000;
}

.nod8-edge-toolbar--visible {
  opacity: 1;
}

/* Wider invisible hover zone — tall enough to bridge toolbar ↔ label gap */
.nod8-edge-hover-zone {
  width: 80px;
  height: 80px;   /* covers toolbar above + label below */
  z-index: 1999;
  opacity: 0;
}

/* ── Buttons ──────────────────────────────────────────────────────── */
.nod8-edge-btn {
  background: none;
  border: none;
  border-radius: var(--nod8-radius-xs, 3px);
  color: var(--nod8-text-muted);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.nod8-edge-btn:hover {
  background: var(--nod8-bg-elevated);
  color: var(--nod8-text-primary);
}

.nod8-edge-btn--danger:hover {
  background: color-mix(in srgb, var(--nod8-red-500, #ef4444) 15%, transparent);
  color: var(--nod8-red-500, #ef4444);
}

/* ── Label (below midpoint) ───────────────────────────────────────── */
.nod8-edge-label {
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: var(--nod8-text-secondary);
  background: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border-subtle);
  border-radius: var(--nod8-radius-xs, 3px);
  padding: 3px 8px;
  white-space: nowrap;
  z-index: 1998;
}

.nod8-edge-label-input {
  background: var(--nod8-bg-base);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-xs, 3px);
  color: var(--nod8-text-primary);
  font-size: 12px;
  height: 22px;
  padding: 0 6px;
  width: 90px;
  outline: none;
}

.nod8-edge-label-input:focus {
  border-color: var(--nod8-accent);
}
</style>
