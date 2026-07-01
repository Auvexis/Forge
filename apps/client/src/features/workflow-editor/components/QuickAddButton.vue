<script setup lang="ts">
import { computed } from 'vue'
import { useEventBus } from '@/shared/composables/useEventBus'
import { useWorkflowStore } from '../stores/workflow.store'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { AllowedNodes, NodeQuickAddMode } from './nodePresentation.types'

const props = defineProps<{
  nodeId: string
  handleId: string
  mode?: 'source' | NodeQuickAddMode
  allowedNodes?: AllowedNodes
  targetHandleId?: string
  alwaysVisible?: boolean
  direction?: 'right' | 'down'
}>()

const workflowStore = useWorkflowStore()
const quickAddBus = useEventBus('node:quick-add')
const isConfigurationQuickAdd = computed(() => props.mode !== undefined && props.mode !== 'source')

const allEdges = computed(() => [
  ...(workflowStore.activeWorkflow?.edges ?? []),
])

const isSourceHandleConnected = (edge: { source?: string; sourceHandle?: string | null }) => {
  if (edge.source !== props.nodeId) return false
  const sourceHandle = edge.sourceHandle ?? 'source'
  return props.handleId === 'source'
    ? sourceHandle === 'source'
    : sourceHandle === props.handleId
}

const hasConnection = computed(() =>
  isConfigurationQuickAdd.value
    ? allEdges.value.some((e) => e.target === props.nodeId && e.targetHandle === props.targetHandleId)
    : allEdges.value.some(isSourceHandleConnected),
)

const onQuickAdd = (event: MouseEvent) => {
  const anchorRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (isConfigurationQuickAdd.value) {
    quickAddBus.emit({
      targetId: props.nodeId,
      targetHandle: props.targetHandleId ?? props.handleId,
      handlerId: props.targetHandleId ?? props.handleId,
      quickAddMode: props.mode,
      ...(props.allowedNodes === undefined ? {} : { allowedNodes: props.allowedNodes }),
      clientX: event.clientX,
      clientY: event.clientY,
      anchorRect,
    })
    return
  }

  quickAddBus.emit({
    sourceId: props.nodeId,
    sourceHandle: props.handleId,
    clientX: event.clientX,
    clientY: event.clientY,
    anchorRect,
  })
}
</script>

<template>
  <div
    v-if="props.alwaysVisible || !hasConnection"
    class="qab-wrap"
    :class="`qab-wrap--${props.direction ?? 'right'}`"
    title="Add connected node"
    @click.stop="onQuickAdd"
    @dblclick.stop.prevent
    @pointerdown.stop
  >
    <div class="qab-cable"></div>
    <button class="qab-btn" type="button">
      <LucideIcon name="plus" :size="11" />
    </button>
  </div>
</template>

<style scoped>
.qab-wrap {
  position: absolute;
  display: flex;
  align-items: center;
  z-index: 5000;
  cursor: pointer;
  pointer-events: all;
}

.qab-wrap--right {
  right: -82px;
  transform: translateY(-50%);
}

.qab-wrap--down {
  position: relative;
  flex-direction: column;
  margin-top: 3px;
  transform: none;
}

.qab-cable {
  width: 60px;
  height: 2px;
  background-color: var(--sailor-node-handle);
  transition: background-color 0.2s;
}

.qab-wrap--down .qab-cable {
  width: 2px;
  height: var(--qab-cable-length, 40px);
}

.qab-btn {
  border-radius: var(--sailor-radius-sm);
  background-color: var(--sailor-node-border);
  border: 2px solid var(--sailor-border-strong);
  color: var(--sailor-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: var(--qab-size, 19px);
  height: var(--qab-size, 19px);
  transition: all 0.2s;
}
</style>
