<template>
  <BaseEdge
    :id="id"
    :style="computedStyle"
    :path="pathData[0]"
    :marker-end="selected ? 'url(#sailor-arrow-selected)' : `url(#sailor-arrow-${edgeStatus})`"
  />

  <EdgeLabelRenderer>
    <div
      v-if="label"
      class="plugin-creator-edge-label nodrag nopan"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, 14px) translate(${pathData[1]}px,${pathData[2]}px)`,
        pointerEvents: 'none',
      }"
    >
      {{ label }}
    </div>
  </EdgeLabelRenderer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'

import { usePluginCreatorExecutionStore } from '../stores/pluginCreatorExecution.store.ts'

const props = defineProps<EdgeProps>()
const executionStore = usePluginCreatorExecutionStore()

const pathData = computed(() =>
  getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  }),
)

const edgeStatus = computed(() => executionStore.getEdgeStatus(props.source, props.target))

const strokeColor = computed(() => {
  if (props.selected) return 'var(--sailor-rf-edge-stroke-selected)'
  switch (edgeStatus.value) {
    case 'success':
      return 'var(--sailor-green-500, #22c55e)'
    case 'failed':
      return 'var(--sailor-red-500, #ef4444)'
    case 'running':
    case 'waiting':
      return 'var(--sailor-amber-500, #f59e0b)'
    default:
      return 'var(--sailor-rf-edge-stroke)'
  }
})

const computedStyle = computed(() => ({
  ...props.style,
  stroke: strokeColor.value,
  strokeWidth: edgeStatus.value !== 'idle' ? 3 : 2,
  transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
}))
</script>

<style scoped>
.plugin-creator-edge-label {
  z-index: 1998;
  padding: 3px 8px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-xs, 3px);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-secondary);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
</style>
