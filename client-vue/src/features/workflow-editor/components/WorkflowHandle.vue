<template>
  <span
    ref="handleRef"
    class="sailor-base-handle"
    :class="[`is-position-${side}`, `is-variant-${variant}`]"
    :data-workflow-node-id="nodeId"
    :data-workflow-handle-id="handleId"
    :data-workflow-handle-type="props.type"
  >
    <span class="sailor-base-handle__visual" />
  </span>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  normalizeWorkflowHandleSide,
  workflowCanvasHandleRegistryKey,
  workflowCanvasNodeIdKey,
  type WorkflowHandleType,
  type WorkflowHandleVariant,
} from '../workflow-canvas/workflowCanvasHandles'

const props = withDefaults(defineProps<{
  id?: string
  type: WorkflowHandleType
  position: unknown
  variant?: WorkflowHandleVariant
}>(), {
  variant: 'circle',
})

const registry = inject(workflowCanvasHandleRegistryKey, null)
const nodeId = inject(workflowCanvasNodeIdKey, '')
const handleRef = ref<HTMLElement | null>(null)
const side = computed(() => normalizeWorkflowHandleSide(props.position))
const handleId = computed(() => props.id ?? props.type)
let unregisterHandle: (() => void) | null = null

function registerHandle() {
  unregisterHandle?.()
  unregisterHandle = null

  if (!registry || !nodeId || !handleRef.value) return
  unregisterHandle = registry.registerHandle({
    nodeId,
    handleId: handleId.value,
    type: props.type,
    position: side.value,
    variant: props.variant,
    element: handleRef.value,
  })
}

onMounted(registerHandle)
onBeforeUnmount(() => unregisterHandle?.())
watch(() => [handleId.value, props.type, side.value, props.variant], registerHandle, { flush: 'post' })
</script>

<style scoped>
.sailor-base-handle {
  position: absolute;
  width: 0 !important;
  height: 0 !important;
  min-width: 0;
  min-height: 0;
  border: 0 !important;
  background: transparent !important;
  overflow: visible;
  pointer-events: all;
}

.sailor-base-handle.is-position-top {
  top: 0;
  left: 50%;
}

.sailor-base-handle.is-position-right {
  top: 50%;
  right: 0;
}

.sailor-base-handle.is-position-bottom {
  bottom: 0;
  left: 50%;
}

.sailor-base-handle.is-position-left {
  top: 50%;
  left: 0;
}

.sailor-base-handle::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  content: '';
  cursor: crosshair;
  transform: translate(-50%, -50%);
}

.sailor-base-handle__visual {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 1px solid var(--sailor-border-strong);
  border-radius: 100%;
  background-color: var(--sailor-node-handle);
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.sailor-base-handle:hover .sailor-base-handle__visual {
  background-color: var(--sailor-node-handle-hover);
}

.sailor-base-handle.is-position-left .sailor-base-handle__visual,
.sailor-base-handle.is-variant-bar .sailor-base-handle__visual {
  width: 8px;
  height: 25px;
  border-radius: 2px;
}

.sailor-base-handle.is-variant-diamond .sailor-base-handle__visual {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  transform: translate(-50%, -50%) rotate(45deg);
}
</style>
