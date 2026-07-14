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
.fabric-base-handle {
  width: 0 !important;
  height: 0 !important;
  min-width: 0;
  min-height: 0;
  border: 0 !important;
  background: transparent !important;
  overflow: visible;
}

.fabric-base-handle::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  content: '';
  cursor: crosshair;
  transform: translate(-50%, -50%);
}

.fabric-base-handle__visual {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 1px solid var(--fabric-workflow-handle-border, var(--fabric-border-strong));
  border-radius: 100%;
  background-color: var(--fabric-workflow-handle-bg, var(--fabric-node-handle));
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fabric-base-handle:hover .fabric-base-handle__visual {
  border-color: var(--fabric-workflow-handle-hover-border, var(--fabric-workflow-handle-border, var(--fabric-border-strong)));
  background-color: var(--fabric-workflow-handle-hover-bg, var(--fabric-node-handle-hover));
}

.fabric-base-handle.is-position-left .fabric-base-handle__visual,
.fabric-base-handle.is-variant-bar .fabric-base-handle__visual {
  width: 8px;
  height: 25px;
  border-radius: 2px;
}

.fabric-base-handle.is-variant-diamond .fabric-base-handle__visual {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  transform: translate(-50%, -50%) rotate(45deg);
}
</style>
