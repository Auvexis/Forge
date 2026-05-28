<template>
  <BaseEdge
    :id="id"
    :style="computedStyle"
    :path="pathData[0]"
    :marker-end="selected ? 'url(#sailor-arrow-selected)' : `url(#sailor-arrow-${edgeStatus})`"
  />

  <EdgeLabelRenderer>
    <div
      class="plugin-creator-edge-toolbar nodrag nopan"
      :class="{ 'plugin-creator-edge-toolbar--visible': isHovered || selected }"
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-50%, calc(-100% - 14px)) translate(${pathData[1]}px,${pathData[2]}px) scale(${toolbarScale})`,
        transformOrigin: 'center bottom',
      }"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <button class="plugin-creator-edge-btn" type="button" title="Add block between" @click.stop="onQuickAdd">
        <LucideIcon name="plus" :size="14" />
      </button>
      <button class="plugin-creator-edge-btn plugin-creator-edge-btn--danger" type="button" title="Delete connection" @click.stop="onDelete">
        <LucideIcon name="trash" :size="13" />
      </button>
    </div>

    <div
      class="plugin-creator-edge-hover-zone nodrag nopan"
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${pathData[1]}px,${pathData[2]}px)`,
      }"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    />

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
import { computed, ref } from 'vue'
import { BaseEdge, EdgeLabelRenderer, useVueFlow } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useEventBus } from '@/shared/composables/useEventBus'

import { usePluginCreatorExecutionStore } from '../stores/pluginCreatorExecution.store.ts'
import { routedBezierPath } from '../../workflow-editor/composables/useEdgeRouting'

const props = defineProps<EdgeProps>()
const executionStore = usePluginCreatorExecutionStore()
const { removeEdges, getNodes, viewport } = useVueFlow()
const isHovered = ref(false)
const quickAddBetweenBus = useEventBus('edge:quick-add-between')
const toolbarScale = computed(() => {
  const zoom = viewport.value.zoom || 1
  return Math.min(2, Math.max(1, 1 / zoom))
})

const pathData = computed(() => {
  const [path, labelX, labelY] = routedBezierPath(
    props.sourceX,
    props.sourceY,
    props.targetX,
    props.targetY,
    props.sourcePosition,
    props.targetPosition,
    getNodes.value,
    [props.source, props.target],
  )
  return [path, labelX, labelY] as [string, number, number]
})

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

function onDelete() {
  removeEdges(props.id)
}

function onQuickAdd() {
  quickAddBetweenBus.emit({
    edgeId: props.id,
    sourceId: props.source,
    targetId: props.target,
    sourceHandle: props.sourceHandleId ?? props.data?.sourceHandle,
    targetHandle: props.targetHandleId ?? props.data?.targetHandle,
  })
}
</script>

<style scoped>
.plugin-creator-edge-toolbar {
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.plugin-creator-edge-toolbar--visible {
  opacity: 1;
}

.plugin-creator-edge-hover-zone {
  z-index: 1999;
  width: 80px;
  height: 80px;
  opacity: 0;
}

.plugin-creator-edge-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: var(--sailor-radius-xs, 3px);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-muted);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.plugin-creator-edge-btn:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.plugin-creator-edge-btn--danger:hover {
  background: color-mix(in srgb, var(--sailor-red-500, #ef4444) 15%, transparent);
  color: var(--sailor-red-500, #ef4444);
}

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
