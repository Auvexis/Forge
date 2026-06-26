<script setup lang="ts">
import { useAttrs } from 'vue'
import type { Position } from './nodePresentation.types'
import WorkflowHandle from './WorkflowHandle.vue'

const props = defineProps<{
  id?: string
  type: 'source' | 'target'
  position: Position
  variant?: 'bar' | 'circle' | 'diamond'
}>()

const attrs = useAttrs()
</script>

<template>
  <WorkflowHandle
    v-bind="attrs"
    :id="props.id"
    :type="props.type"
    :position="props.position"
    :variant="props.variant ?? 'circle'"
  />
</template>

<style scoped>
.sailor-base-handle {
  width: 0 !important;
  height: 0 !important;
  min-width: 0;
  min-height: 0;
  border: 0 !important;
  background: transparent !important;
  overflow: visible;
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
