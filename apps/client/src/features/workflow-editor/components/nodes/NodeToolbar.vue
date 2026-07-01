<template>
  <div
    class="nt-toolbar"
    :class="{ 'nt-toolbar--visible': visible && !isMultiSelection }"
    :style="{ '--nt-toolbar-scale': toolbarScale }"
    @mousedown.stop
    @click.stop
  >
    <!-- Clone -->
    <button class="nt-btn" title="Duplicate node" @click="cloneNode">
      <LucideIcon name="copy-plus" :size="13" />
    </button>

    <button
      class="nt-btn"
      title="Disable node"
      :aria-label="isNodeDisabled ? 'Enable node' : 'Disable node'"
      @click="toggleDisabled"
    >
      <LucideIcon :name="isNodeDisabled ? 'eye-off' : 'ban'" :size="13" />
    </button>

    <!-- Delete -->
    <button class="nt-btn nt-btn--danger" title="Delete node" @click="deleteNode">
      <LucideIcon name="trash-2" :size="13" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { useExecutionStore } from '@/features/workflow-editor/stores/execution.store'
import { useEventBus } from '@/shared/composables/useEventBus'

const props = defineProps<{
  nodeId: string
  visible: boolean
}>()

const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()
const toolbarBus = useEventBus<{ action: 'duplicate' | 'delete' | 'disable'; nodeId: string }>(
  'node:toolbar-action',
)

const isMultiSelection = computed(() => false)
const toolbarScale = computed(() => 1)

// nodeStatuses is Record<string, NodeExecutionState>; with noUncheckedIndexedAccess the
// lookup can return undefined — the computed value reflects that correctly.
const nodeState = computed(() => executionStore.nodeStatuses[props.nodeId])
const isNodeDisabled = computed(() => workflowStore.activeWorkflow?.nodes[props.nodeId]?.disabled === true)

// ── Actions ────────────────────────────────────────────────────────────────

function cloneNode() {
  toolbarBus.emit({ action: 'duplicate', nodeId: props.nodeId })
}

function deleteNode() {
  toolbarBus.emit({ action: 'delete', nodeId: props.nodeId })
}

function toggleDisabled() {
  toolbarBus.emit({ action: 'disable', nodeId: props.nodeId })
}
</script>

<style scoped>
/* ── Shell ────────────────────────────────────────────────────────────────── */

.nt-toolbar {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%) scale(var(--nt-toolbar-scale, 1));
  transform-origin: center bottom;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 5px;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--sailor-duration-fast);
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
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  border: none;
  color: var(--sailor-text-muted);
  cursor: pointer;
  transition:
    background-color var(--sailor-duration-fast),
    color var(--sailor-duration-fast);
}

.nt-btn:hover {
  background-color: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

/* Output button when node errored */
.nt-btn--error {
  color: var(--sailor-amber-400);
}

.nt-btn--error:hover {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--sailor-amber-400);
}

/* Delete button */
.nt-btn--danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--sailor-red-400);
}
</style>
