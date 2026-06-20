<template>
  <path
    :d="path"
    class="sailor-connection-preview-line"
    :class="props.connectionStatus"
    :marker-start="props.markerStart"
    :marker-end="props.markerEnd"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Position, getBezierPath } from '@vue-flow/core'
import type { ConnectionLineProps, GraphNode, HandleElement } from '@vue-flow/core'

const props = defineProps<ConnectionLineProps>()

function getHandlePoint(
  node: GraphNode,
  handle: HandleElement,
  fallbackPosition: Position,
): { x: number; y: number } {
  const x = (handle.x ?? 0) + node.computedPosition.x
  const y = (handle.y ?? 0) + node.computedPosition.y
  const width = handle.width ?? 0
  const height = handle.height ?? 0
  const position = handle.position ?? fallbackPosition

  if (position === Position.Top) return { x: x + width / 2, y }
  if (position === Position.Right) return { x: x + width, y: y + height / 2 }
  if (position === Position.Bottom) return { x: x + width / 2, y: y + height }
  return { x, y: y + height / 2 }
}

const targetPoint = computed(() => {
  if (props.targetHandle && props.targetNode) {
    return getHandlePoint(props.targetNode, props.targetHandle, props.targetPosition)
  }

  return {
    x: props.targetX,
    y: props.targetY,
  }
})

const path = computed(() => getBezierPath({
  sourceX: props.sourceX,
  sourceY: props.sourceY,
  sourcePosition: props.sourcePosition,
  targetX: targetPoint.value.x,
  targetY: targetPoint.value.y,
  targetPosition: props.targetPosition,
})[0])
</script>

<style scoped>
.sailor-connection-preview-line {
  fill: none;
  stroke: var(--sailor-rf-edge-stroke);
  stroke-width: 2;
  stroke-linecap: round;
  pointer-events: none;
}

.sailor-connection-preview-line.valid {
  stroke: var(--sailor-rf-edge-stroke-selected);
}

.sailor-connection-preview-line.invalid {
  stroke: var(--sailor-red-500, #ef4444);
}
</style>
