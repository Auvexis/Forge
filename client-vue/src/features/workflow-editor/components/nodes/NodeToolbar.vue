<template>
  <div
    class="nt-toolbar"
    :class="{ 'nt-toolbar--visible': visible && !isMultiSelection }"
    @mousedown.stop
    @click.stop
  >
    <!-- Clone -->
    <button class="nt-btn" title="Duplicate node" @click="cloneNode">
      <LucideIcon name="copy-plus" :size="13" />
    </button>

    <!-- Delete -->
    <button class="nt-btn nt-btn--danger" title="Delete node" @click="deleteNode">
      <LucideIcon name="trash-2" :size="13" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { useExecutionStore } from '@/features/workflow-editor/stores/execution.store'
import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import type { WorkflowNode } from '@/core/types/workflow.types'

const props = defineProps<{
  nodeId: string
  visible: boolean
}>()

const { removeNodes, getNodes, addNodes, getSelectedNodes } = useVueFlow()
const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()
const panelStore = useAppPanelStore()

const isMultiSelection = computed(() => getSelectedNodes.value.length >= 2)

// nodeStatuses is Record<string, NodeExecutionState>; with noUncheckedIndexedAccess the
// lookup can return undefined — the computed value reflects that correctly.
const nodeState = computed(() => executionStore.nodeStatuses[props.nodeId])

// ── Actions ────────────────────────────────────────────────────────────────

function cloneNode() {
  const original = getNodes.value.find((n) => n.id === props.nodeId)
  if (!original || !workflowStore.activeWorkflow) return

  const newId = `${props.nodeId}_${Date.now().toString(36)}`
  const newPosition = { x: original.position.x + 30, y: original.position.y + 30 }

  // Cast the VueFlow generic data bag to our domain type, then build the clone.
  const clonedData = { ...(original.data as WorkflowNode) }
  const clonedNode: WorkflowNode = {
    ...clonedData,
    ui: { positionX: newPosition.x, positionY: newPosition.y },
  } as WorkflowNode

  // Persist to workflow store first using a local reference so we never
  // re-index the record (noUncheckedIndexedAccess would widen to T | undefined).
  workflowStore.activeWorkflow.nodes[newId] = clonedNode

  addNodes([
    {
      id: newId,
      type: original.type ?? 'plugin',
      position: newPosition,
      data: clonedNode as unknown as Record<string, unknown>,
    },
  ])
}

function deleteNode() {
  if (!workflowStore.activeWorkflow) return

  removeNodes([props.nodeId])

  delete workflowStore.activeWorkflow.nodes[props.nodeId]

  workflowStore.activeWorkflow.edges = workflowStore.activeWorkflow.edges.filter(
    (e) => e.source !== props.nodeId && e.target !== props.nodeId,
  )

  panelStore.closePanel()
}
</script>

<style scoped>
/* ── Shell ────────────────────────────────────────────────────────────────── */

.nt-toolbar {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 3px;
  background-color: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  padding: 3px 5px;
  box-shadow: var(--nod8-shadow-md);
  /* Hidden by default — revealed via the --visible modifier */
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--nod8-duration-fast);
  white-space: nowrap;
  z-index: 20;
}

.nt-toolbar--visible {
  opacity: 1;
  pointer-events: auto;
}

/* ── Buttons ──────────────────────────────────────────────────────────────── */

.nt-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nod8-radius-sm);
  background: transparent;
  border: none;
  color: var(--nod8-text-muted);
  cursor: pointer;
  transition: background-color var(--nod8-duration-fast), color var(--nod8-duration-fast);
}

.nt-btn:hover {
  background-color: var(--nod8-bg-elevated);
  color: var(--nod8-text-primary);
}

/* Output button when node errored */
.nt-btn--error {
  color: var(--nod8-amber-400);
}

.nt-btn--error:hover {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--nod8-amber-400);
}

/* Delete button */
.nt-btn--danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--nod8-red-400);
}
</style>
