<template>
  <EdgeLabelRenderer v-if="showBox">
    <!-- Dual-border selection box (renders in canvas space) -->
    <div
      class="nod8-group-box-outer"
      :style="outerBoxStyle"
    >
      <div class="nod8-group-box-inner" />
    </div>

    <!-- Toolbar above the box -->
    <div
      class="nodrag nopan nod8-group-toolbar"
      :style="toolbarStyle"
    >
      <span class="nod8-group-count">
        <LucideIcon name="layers" :size="12" />
        {{ selectedNodes.length }} nodes selected
      </span>

      <div class="nod8-group-divider" />

      <button class="nod8-group-btn" @click="duplicateAll" title="Duplicate all">
        <LucideIcon name="copy" :size="13" />
        <span>Duplicate</span>
      </button>

      <button class="nod8-group-btn nod8-group-btn--danger" @click="deleteAll" title="Delete all selected">
        <LucideIcon name="trash-2" :size="13" />
        <span>Delete All</span>
      </button>
    </div>
  </EdgeLabelRenderer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EdgeLabelRenderer, useVueFlow } from '@vue-flow/core'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { isMultiSelection } from '../composables/useCanvasSelecting'

const { getSelectedNodes, removeNodes } = useVueFlow()
const workflowStore = useWorkflowStore()

const PADDING = 24   // space around nodes inside the box
const TOOLBAR_H = 40 // approx height of toolbar (for positioning)

// ── Selected nodes ──────────────────────────────────────────────────────────

const selectedNodes = computed(() =>
  getSelectedNodes.value.filter((n) => n.dimensions?.width && n.dimensions?.height),
)

const showBox = computed(() => isMultiSelection.value && selectedNodes.value.length >= 2)

// ── Bounding box in canvas/flow coordinates ─────────────────────────────────

const bbox = computed(() => {
  const nodes = selectedNodes.value
  if (!nodes.length) return { x: 0, y: 0, w: 0, h: 0 }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const n of nodes) {
    const x1 = n.position.x
    const y1 = n.position.y
    const x2 = x1 + (n.dimensions?.width  ?? 200)
    const y2 = y1 + (n.dimensions?.height ?? 80)
    if (x1 < minX) minX = x1
    if (y1 < minY) minY = y1
    if (x2 > maxX) maxX = x2
    if (y2 > maxY) maxY = y2
  }

  return {
    x: minX - PADDING,
    y: minY - PADDING,
    w: maxX - minX + PADDING * 2,
    h: maxY - minY + PADDING * 2,
  }
})

// ── Styles ──────────────────────────────────────────────────────────────────

const outerBoxStyle = computed(() => ({
  position: 'absolute' as const,
  left: 0,
  top: 0,
  transform: `translate(${bbox.value.x}px, ${bbox.value.y}px)`,
  width: `${bbox.value.w}px`,
  height: `${bbox.value.h}px`,
  pointerEvents: 'none' as const,
  zIndex: 500,
}))

const toolbarStyle = computed(() => ({
  position: 'absolute' as const,
  left: 0,
  top: 0,
  // Centered above the box
  transform: `translate(${bbox.value.x + bbox.value.w / 2}px, ${bbox.value.y - TOOLBAR_H - 12}px) translateX(-50%)`,
  pointerEvents: 'all' as const,
  zIndex: 501,
}))

// ── Actions ─────────────────────────────────────────────────────────────────

function deleteAll() {
  if (!workflowStore.activeWorkflow) return
  const ids = selectedNodes.value.map((n) => n.id)

  // Remove edges referencing any of these nodes
  workflowStore.activeWorkflow.edges = workflowStore.activeWorkflow.edges.filter(
    (e: { source: string; target: string }) => !ids.includes(e.source) && !ids.includes(e.target),
  )

  // Remove nodes from store
  for (const id of ids) {
    if (id === 'trigger') continue
    delete workflowStore.activeWorkflow.nodes[id]
  }

  // Remove from VueFlow
  removeNodes(ids)
}

function duplicateAll() {
  // Future feature — no-op for now to keep the API clean
}
</script>

<style scoped>
/* ── Outer box (weak accent border + subtle fill) ──────────────────── */
.nod8-group-box-outer {
  border: 2px dashed color-mix(in srgb, var(--nod8-accent) 30%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--nod8-accent) 4%, transparent);
  box-sizing: border-box;
}

/* ── Inner box (strong accent border) ─────────────────────────────── */
.nod8-group-box-inner {
  position: absolute;
  inset: 4px;
  border: 1.5px solid color-mix(in srgb, var(--nod8-accent) 60%, transparent);
  border-radius: 7px;
  pointer-events: none;
}

/* ── Toolbar ───────────────────────────────────────────────────────── */
.nod8-group-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  box-shadow: var(--nod8-shadow-md), 0 0 0 1px color-mix(in srgb, var(--nod8-accent) 20%, transparent);
  white-space: nowrap;
}

.nod8-group-count {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--nod8-text-secondary);
}

.nod8-group-divider {
  width: 1px;
  height: 18px;
  background: var(--nod8-border);
  margin: 0 2px;
}

.nod8-group-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  background: none;
  border: none;
  border-radius: var(--nod8-radius-xs, 3px);
  color: var(--nod8-text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.nod8-group-btn:hover {
  background: var(--nod8-bg-elevated);
  color: var(--nod8-text-primary);
}

.nod8-group-btn--danger:hover {
  background: color-mix(in srgb, var(--nod8-red-500, #ef4444) 12%, transparent);
  color: var(--nod8-red-500, #ef4444);
}
</style>
