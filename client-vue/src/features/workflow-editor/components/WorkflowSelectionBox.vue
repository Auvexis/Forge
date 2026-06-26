<template>
  <div v-if="showBox" class="workflow-selection-box" data-workflow-selection-box :style="viewportTransform">
    <div class="sailor-group-box-outer" :style="outerBoxStyle">
      <div class="sailor-group-box-inner" />
    </div>

    <div class="sailor-group-toolbar" :style="toolbarStyle">
      <span class="sailor-group-count">
        <LucideIcon name="layers" :size="12" />
        {{ selectedItems.length }} nodes selected
      </span>
      <div class="sailor-group-divider" />
      <button class="sailor-group-btn" type="button" title="Duplicate all" @click.stop="duplicateSelection">
        <LucideIcon name="copy" :size="13" />
        <span>Duplicate</span>
      </button>
      <button class="sailor-group-btn sailor-group-btn--danger" type="button" title="Delete all selected" @click.stop="deleteSelection">
        <LucideIcon name="trash-2" :size="13" />
        <span>Delete All</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BaseCanvasItem, BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  items: BaseCanvasItem[]
  selection: string[]
  viewport: BaseCanvasViewport
}>()

const emit = defineEmits<{
  duplicateSelection: []
  deleteSelection: []
}>()

const PADDING_TOP = 24
const PADDING_BOTTOM = 60
const PADDING_LEFT = 24
const PADDING_RIGHT = 24
const TOOLBAR_H = 40

const selectedItems = computed(() => props.items.filter((item) => props.selection.includes(item.id)))
const showBox = computed(() => selectedItems.value.length >= 2)
const toolbarScale = computed(() => {
  const zoom = props.viewport.zoom || 1
  return Math.min(2, Math.max(1, 1 / zoom))
})
const viewportTransform = computed(() => ({
  transform: `translate(${props.viewport.x}px, ${props.viewport.y}px) scale(${props.viewport.zoom})`,
}))

const bbox = computed(() => {
  const items = selectedItems.value
  if (!items.length) return { x: 0, y: 0, w: 0, h: 0 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const item of items) {
    const x1 = item.x
    const y1 = item.y
    const x2 = x1 + (item.width ?? 200)
    const y2 = y1 + (item.height ?? 80)
    minX = Math.min(minX, x1)
    minY = Math.min(minY, y1)
    maxX = Math.max(maxX, x2)
    maxY = Math.max(maxY, y2)
  }

  return {
    x: minX - PADDING_LEFT,
    y: minY - PADDING_TOP,
    w: maxX - minX + PADDING_LEFT + PADDING_RIGHT,
    h: maxY - minY + PADDING_TOP + PADDING_BOTTOM,
  }
})

const outerBoxStyle = computed(() => ({
  transform: `translate(${bbox.value.x}px, ${bbox.value.y}px)`,
  width: `${bbox.value.w}px`,
  height: `${bbox.value.h}px`,
}))

const toolbarStyle = computed(() => ({
  transform: `translate(${bbox.value.x + bbox.value.w / 2}px, ${bbox.value.y - TOOLBAR_H * toolbarScale.value - 12}px) translateX(-50%) scale(${toolbarScale.value})`,
  transformOrigin: 'center bottom',
}))

function duplicateSelection() {
  emit('duplicateSelection')
}

function deleteSelection() {
  emit('deleteSelection')
}
</script>

<style scoped>
.workflow-selection-box {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  transform-origin: 0 0;
}

.sailor-group-box-outer {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  border: 2px dashed color-mix(in srgb, var(--sailor-accent) 30%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--sailor-accent) 4%, transparent);
  pointer-events: none;
}

.sailor-group-box-inner {
  position: absolute;
  inset: 4px;
  border: 1.5px solid color-mix(in srgb, var(--sailor-accent) 60%, transparent);
  border-radius: 6px;
  pointer-events: none;
}

.sailor-group-toolbar {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: var(--sailor-bg-surface);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  box-shadow: var(--sailor-shadow-md), 0 0 0 1px color-mix(in srgb, var(--sailor-accent) 20%, transparent);
  white-space: nowrap;
  pointer-events: auto;
}

.sailor-group-count,
.sailor-group-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
}

.sailor-group-count {
  color: var(--sailor-text-secondary);
}

.sailor-group-divider {
  width: 1px;
  height: 18px;
  margin: 0 2px;
  background: var(--sailor-border);
}

.sailor-group-btn {
  padding: 4px 8px;
  color: var(--sailor-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: var(--sailor-radius-xs, 3px);
  transition: background 0.15s ease, color 0.15s ease;
}

.sailor-group-btn:hover {
  color: var(--sailor-text-primary);
  background: var(--sailor-bg-elevated);
}

.sailor-group-btn--danger:hover {
  color: var(--sailor-red-500, #ef4444);
  background: color-mix(in srgb, var(--sailor-red-500, #ef4444) 12%, transparent);
}
</style>
