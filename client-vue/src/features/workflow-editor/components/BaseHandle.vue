<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{
  id?: string
  type: 'source' | 'target'
  position: Position
}>()
</script>

<template>
  <Handle
    :id="props.id"
    :type="props.type"
    :position="props.position"
    class="nod8-base-handle"
    :class="`is-position-${props.position}`"
  />
</template>

<style scoped>
.nod8-base-handle {
  width: 8px;
  height: 25px;
  background-color: var(--nod8-node-handle);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nod8-base-handle:hover {
  background-color: var(--nod8-node-handle-hover);
}

.nod8-base-handle.is-position-left {
  left: -1px !important;
  border-radius: 2px !important;
}

.nod8-base-handle.is-position-right {
  width: 12px !important;
  height: 12px !important;
  right: -1px !important;
  border-radius: 100% !important;
}

.nod8-base-handle.is-position-bottom {
  width: 12px !important;
  height: 12px !important;
  bottom: -1px !important;
  border-radius: 100% !important;
}
</style>
