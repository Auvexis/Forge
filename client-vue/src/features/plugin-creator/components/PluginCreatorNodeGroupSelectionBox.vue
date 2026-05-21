<template>
  <EdgeLabelRenderer v-if="showBox">
    <div class="sailor-group-box-outer" :style="outerBoxStyle">
      <div class="sailor-group-box-inner" />
    </div>

    <div class="nodrag nopan sailor-group-toolbar" :style="toolbarStyle">
      <span class="sailor-group-count">
        <LucideIcon name="layers" :size="12" />
        {{ selectedNodes.length }} nodes selected
      </span>

      <div class="sailor-group-divider" />

      <button class="sailor-group-btn" title="Duplicate all" @click="duplicateAll">
        <LucideIcon name="copy" :size="13" />
        <span>Duplicate</span>
      </button>

      <button class="sailor-group-btn sailor-group-btn--danger" title="Delete all selected" @click="deleteAll">
        <LucideIcon name="trash-2" :size="13" />
        <span>Delete All</span>
      </button>
    </div>
  </EdgeLabelRenderer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EdgeLabelRenderer, useVueFlow } from '@vue-flow/core'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  onDuplicateSelection?: () => void
  onDeleteSelection?: () => void
}>()

const { getSelectedNodes, viewport } = useVueFlow()

const PADDING_TOP = 24
const PADDING_BOTTOM = 60
const PADDING_LEFT = 24
const PADDING_RIGHT = 24
const TOOLBAR_H = 40

const selectedNodes = computed(() =>
  getSelectedNodes.value.filter((node) => node.dimensions?.width && node.dimensions?.height),
)

const isMultiSelection = computed(() => getSelectedNodes.value.length >= 2)
const showBox = computed(() => isMultiSelection.value && selectedNodes.value.length >= 2)
const toolbarScale = computed(() => {
  const zoom = viewport.value.zoom || 1
  return Math.min(2, Math.max(1, 1 / zoom))
})

const bbox = computed(() => {
  const nodes = selectedNodes.value
  if (!nodes.length) return { x: 0, y: 0, w: 0, h: 0 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    const x1 = node.position.x
    const y1 = node.position.y
    const x2 = x1 + (node.dimensions?.width ?? 200)
    const y2 = y1 + (node.dimensions?.height ?? 80)
    if (x1 < minX) minX = x1
    if (y1 < minY) minY = y1
    if (x2 > maxX) maxX = x2
    if (y2 > maxY) maxY = y2
  }

  return {
    x: minX - PADDING_LEFT,
    y: minY - PADDING_TOP,
    w: maxX - minX + PADDING_LEFT + PADDING_RIGHT,
    h: maxY - minY + PADDING_TOP + PADDING_BOTTOM,
  }
})

const outerBoxStyle = computed(() => ({
  position: 'absolute' as const,
  left: 0,
  top: 0,
  transform: `translate(${bbox.value.x}px, ${bbox.value.y}px)`,
  width: `${bbox.value.w}px`,
  height: `${bbox.value.h}px`,
  pointerEvents: 'none' as const,
  zIndex: 500,
}))

const toolbarStyle = computed(() => ({
  position: 'absolute' as const,
  left: 0,
  top: 0,
  transform: `translate(${bbox.value.x + bbox.value.w / 2}px, ${bbox.value.y - TOOLBAR_H * toolbarScale.value - 12}px) translateX(-50%) scale(${toolbarScale.value})`,
  transformOrigin: 'center bottom',
  pointerEvents: 'all' as const,
  zIndex: 501,
}))

function deleteAll() {
  props.onDeleteSelection?.()
}

function duplicateAll() {
  props.onDuplicateSelection?.()
}
</script>

<style scoped>
.sailor-group-box-outer {
  border: 2px dashed color-mix(in srgb, var(--sailor-accent) 30%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--sailor-accent) 4%, transparent);
  box-sizing: border-box;
}

.sailor-group-box-inner {
  position: absolute;
  inset: 4px;
  border: 1.5px solid color-mix(in srgb, var(--sailor-accent) 60%, transparent);
  border-radius: 7px;
  pointer-events: none;
}

.sailor-group-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: var(--sailor-bg-surface);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  box-shadow: var(--sailor-shadow-md), 0 0 0 1px color-mix(in srgb, var(--sailor-accent) 20%, transparent);
  white-space: nowrap;
}

.sailor-group-count {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--sailor-text-secondary);
}

.sailor-group-divider {
  width: 1px;
  height: 18px;
  margin: 0 2px;
  background: var(--sailor-border);
}

.sailor-group-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border: none;
  border-radius: var(--sailor-radius-xs, 3px);
  background: none;
  color: var(--sailor-text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.sailor-group-btn:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.sailor-group-btn--danger:hover {
  background: color-mix(in srgb, var(--sailor-red-500, #ef4444) 12%, transparent);
  color: var(--sailor-red-500, #ef4444);
}
</style>
