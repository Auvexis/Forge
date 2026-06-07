<template>
  <!-- ── Edge path ── -->
  <BaseEdge
    :id="id"
    :style="computedStyle"
    :path="pathData[0]"
    :marker-end="props.selected ? 'url(#sailor-arrow-selected)' : `url(#sailor-arrow-${edgeStatus})`"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dblclick.stop="startEditLabel"
  />

  <!-- ── Floating elements ── -->
  <EdgeLabelRenderer>
    <!-- Toolbar ABOVE the edge midpoint -->
    <div
      v-if="!isAgentConfigEdge"
      class="nodrag nopan sailor-edge-toolbar"
      :class="{ 'sailor-edge-toolbar--visible': !isMultiSelection && (isHovered || selected) }"
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
      <button class="sailor-edge-btn" @click.stop="onQuickAdd" title="Insert node here">
        <LucideIcon name="plus" :size="13" />
      </button>

      <!-- Delete -->
      <button class="sailor-edge-btn sailor-edge-btn--danger" @click.stop="onDelete" title="Delete connection">
        <LucideIcon name="trash" :size="13" />
      </button>
    </div>

    <!-- Invisible wider hover zone spanning toolbar + label area -->
    <div
      v-if="!isAgentConfigEdge"
      class="nodrag nopan sailor-edge-hover-zone"
      :style="{
        pointerEvents: 'none',
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${pathData[1]}px,${pathData[2]}px)`,
      }"
    />

    <div
      v-if="edgeItemCountLabel"
      class="nodrag nopan sailor-edge-item-count"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, calc(-100% - 42px)) translate(${pathData[1]}px,${pathData[2]}px)`,
        pointerEvents: 'none',
      }"
    >
      {{ edgeItemCountLabel }}
    </div>

    <!-- Inline label on the edge midpoint -->
    <div
      v-if="edgeLabel || isEditingLabel"
      class="nodrag nopan sailor-edge-label-shell"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${pathData[1]}px,${pathData[2]}px)`,
        pointerEvents: isEditingLabel ? 'all' : 'none',
      }"
      @dblclick.stop="startEditLabel"
    >
      <input
        v-if="isEditingLabel"
        ref="labelInputRef"
        class="sailor-edge-label-input"
        v-model="labelDraft"
        placeholder="Label..."
        @keydown.enter.stop="commitLabel"
        @keydown.escape.stop="cancelLabel"
        @blur="commitLabel"
      />
      <span v-else class="sailor-edge-label">{{ edgeLabel }}</span>
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
const AGENT_CONFIG_TARGET_HANDLES = new Set(['chatModel', 'memory', 'tool'])
const isAgentConfigEdge = computed(() =>
  AGENT_CONFIG_TARGET_HANDLES.has(String(props.targetHandleId ?? props.data?.targetHandle ?? '')),
)

const isMultiSelection = computed(() => getSelectedNodes.value.length >= 2)
const toolbarScale = computed(() => {
  const zoom = viewport.value.zoom || 1
  return Math.min(2, Math.max(1, 1 / zoom))
})

// ── Path ─────────────────────────────────────────────────────────────────────

function agentConfigBezierPath(sx: number, sy: number, tx: number, ty: number): [string, number, number] {
  const verticalGap = Math.abs(sy - ty)
  const pull = Math.min(180, Math.max(72, verticalGap * 0.55))
  const sourcePull = sy > ty ? -pull : pull
  const targetPull = ty > sy ? -pull : pull
  const path = `M ${sx} ${sy} C ${sx} ${sy + sourcePull}, ${tx} ${ty + targetPull}, ${tx} ${ty}`

  return [path, (sx + tx) / 2, (sy + ty) / 2]
}

const pathData = computed(() => {
  if (isAgentConfigEdge.value) {
    return agentConfigBezierPath(props.sourceX, props.sourceY, props.targetX, props.targetY)
  }

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

  if (props.source === 'trigger' || props.source.startsWith('trigger_')) {
    const triggerNodeStatus = executionStore.nodeStatuses[props.source]?.status
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
  if (props.selected) return 'var(--sailor-rf-edge-stroke-selected)'
  switch (edgeStatus.value) {
    case 'success': return 'var(--sailor-green-500, #22c55e)'
    case 'failed':  return 'var(--sailor-red-500, #ef4444)'
    case 'running': return 'var(--sailor-amber-500, #f59e0b)'
    default:        return 'var(--sailor-rf-edge-stroke)'
  }
})

const computedStyle = computed(() => ({
  ...props.style,
  stroke: strokeColor.value,
  strokeWidth: edgeStatus.value !== 'idle' ? 3 : 2,
  strokeDasharray: isAgentConfigEdge.value ? '6 6' : props.style?.strokeDasharray,
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

function onQuickAdd(event: MouseEvent) {
  const anchorRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  quickAddBetweenBus.emit({
    edgeId: props.id,
    sourceId: props.source,
    targetId: props.target,
    sourceHandle: props.sourceHandleId ?? props.data?.sourceHandle,
    targetHandle: props.targetHandleId ?? props.data?.targetHandle,
    clientX: event.clientX,
    clientY: event.clientY,
    anchorRect,
  })
}

// ── Label editing ─────────────────────────────────────────────────────────────

const edgeLabel      = computed(() => props.label as string | undefined)
const edgeItemCountLabel = computed(() => {
  const output = executionStore.nodeStatuses[props.source]?.output
  const count = countItems(output)
  if (count === null) return ''
  return `${count} ${count === 1 ? 'item' : 'items'}`
})
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

function countItems(output: unknown): number | null {
  if (Array.isArray(output)) return output.length
  if (output && typeof output === 'object') {
    const value = output as Record<string, unknown>
    if (Array.isArray(value.items)) return value.items.length
    if (Array.isArray(value.data)) return value.data.length
  }
  return null
}
</script>

<style scoped>
/* ── Toolbar (above midpoint) ────────────────────────────────────── */
.sailor-edge-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 2000;
}

.sailor-edge-toolbar--visible {
  opacity: 1;
}

/* Wider invisible hover zone — tall enough to bridge toolbar ↔ label gap */
.sailor-edge-hover-zone {
  width: 80px;
  height: 80px;   /* covers toolbar above + label below */
  z-index: 1999;
  opacity: 0;
}

/* ── Buttons ──────────────────────────────────────────────────────── */
.sailor-edge-btn {
  background: none;
  border: none;
  border-radius: var(--sailor-radius-xs, 3px);
  color: var(--sailor-text-muted);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.sailor-edge-btn:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.sailor-edge-btn--danger:hover {
  background: color-mix(in srgb, var(--sailor-red-500, #ef4444) 15%, transparent);
  color: var(--sailor-red-500, #ef4444);
}

/* ── Label (below midpoint) ───────────────────────────────────────── */
.sailor-edge-item-count {
  z-index: 1997;
  color: var(--sailor-text-muted);
  font-family: var(--sailor-font-mono);
  font-size: 10px;
  line-height: 1;
  white-space: nowrap;
}

.sailor-edge-label-shell {
  z-index: 1998;
}

.sailor-edge-label {
  display: inline-flex;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: var(--sailor-text-secondary);
  background: var(--sailor-bg-surface);
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-xs, 3px);
  padding: 3px 8px;
  white-space: nowrap;
  z-index: 1998;
}

.sailor-edge-label-input {
  background: var(--sailor-bg-base);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-xs, 3px);
  color: var(--sailor-text-primary);
  font-size: 12px;
  height: 22px;
  padding: 0 6px;
  width: 90px;
  outline: none;
}

.sailor-edge-label-input:focus {
  border-color: var(--sailor-accent);
}
</style>
