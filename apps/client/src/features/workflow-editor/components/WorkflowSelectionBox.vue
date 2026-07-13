<template>
  <div v-if="showBox" class="workflow-selection-box" data-workflow-selection-box :style="viewportTransform">
    <div class="fabric-group-box-outer" :style="outerBoxStyle" @pointerdown.stop="startSelectionDrag">
      <div class="fabric-group-box-inner" />
    </div>

    <div class="fabric-group-toolbar" :style="toolbarStyle">
      <span class="fabric-group-count">
        <LucideIcon name="layers" :size="12" />
        {{ selectedItems.length }} nodes selected
      </span>
      <div class="fabric-group-divider" />
      <button class="fabric-group-btn" type="button" title="Duplicate all" @click.stop="duplicateSelection">
        <LucideIcon name="copy" :size="13" />
        <span>Duplicate</span>
      </button>
      <button class="fabric-group-btn fabric-group-btn--danger" type="button" title="Delete all selected" @click.stop="deleteSelection">
        <LucideIcon name="trash-2" :size="13" />
        <span>Delete All</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { BaseCanvasItem, BaseCanvasItemsMoveEvent, BaseCanvasPoint, BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import { getIncrementalDragDelta } from '@/shared/base-canvas/drag'
import { shouldBypassSnap } from '@/shared/base-canvas/snap'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  items: BaseCanvasItem[]
  selection: string[]
  viewport: BaseCanvasViewport
  gridSize?: number
  snapToGrid?: boolean
}>()

const emit = defineEmits<{
  duplicateSelection: []
  deleteSelection: []
  selectionDragStart: []
  selectionDragEnd: []
  selectionMove: [event: BaseCanvasItemsMoveEvent]
}>()

const PADDING_TOP = 24
const PADDING_BOTTOM = 60
const PADDING_LEFT = 24
const PADDING_RIGHT = 24
const TOOLBAR_H = 40
const activeSelectionDrag = ref<{
  start: BaseCanvasPoint
  previous: BaseCanvasPoint
  emitted: BaseCanvasPoint
  pointerId: number
} | null>(null)

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

function startSelectionDrag(event: PointerEvent) {
  if (event.button !== 0) return
  if (selectedItems.value.length < 2) return
  event.preventDefault()
  activeSelectionDrag.value = {
    start: { x: event.clientX, y: event.clientY },
    previous: { x: event.clientX, y: event.clientY },
    emitted: { x: 0, y: 0 },
    pointerId: event.pointerId,
  }
  emit('selectionDragStart')
  window.addEventListener('pointermove', moveSelection)
  window.addEventListener('pointerup', stopSelectionDrag, { once: true })
  window.addEventListener('pointercancel', stopSelectionDrag, { once: true })
}

function moveSelection(event: PointerEvent) {
  const drag = activeSelectionDrag.value
  if (!drag || event.pointerId !== drag.pointerId) return
  const { delta, nextPrevious, nextEmitted } = getIncrementalDragDelta({
    start: drag.start,
    previous: drag.previous,
    current: { x: event.clientX, y: event.clientY },
    emitted: drag.emitted,
    zoom: props.viewport.zoom,
    gridSize: props.gridSize ?? 20,
    snapToGrid: props.snapToGrid ?? true,
    bypassSnap: shouldBypassSnap(event),
  })
  drag.previous = nextPrevious
  drag.emitted = nextEmitted
  emit('selectionMove', {
    itemIds: selectedItems.value.map((item) => item.id),
    delta,
  })
}

function stopSelectionDrag() {
  if (activeSelectionDrag.value) emit('selectionDragEnd')
  activeSelectionDrag.value = null
  window.removeEventListener('pointermove', moveSelection)
  window.removeEventListener('pointercancel', stopSelectionDrag)
}

onBeforeUnmount(() => {
  stopSelectionDrag()
})
</script>

<style scoped>
.workflow-selection-box {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  transform-origin: 0 0;
}

.fabric-group-box-outer {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  border: 2px dashed color-mix(in srgb, var(--fabric-accent) 30%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--fabric-accent) 4%, transparent);
  cursor: move;
  pointer-events: auto;
}

.fabric-group-box-inner {
  position: absolute;
  inset: 4px;
  border: 1.5px solid color-mix(in srgb, var(--fabric-accent) 60%, transparent);
  border-radius: 6px;
  pointer-events: none;
}

.fabric-group-toolbar {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: var(--fabric-bg-surface);
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  box-shadow: var(--fabric-shadow-md), 0 0 0 1px color-mix(in srgb, var(--fabric-accent) 20%, transparent);
  white-space: nowrap;
  pointer-events: auto;
}

.fabric-group-count,
.fabric-group-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
}

.fabric-group-count {
  color: var(--fabric-text-secondary);
}

.fabric-group-divider {
  width: 1px;
  height: 18px;
  margin: 0 2px;
  background: var(--fabric-border);
}

.fabric-group-btn {
  padding: 4px 8px;
  color: var(--fabric-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: var(--fabric-radius-xs, 3px);
  transition: background 0.15s ease, color 0.15s ease;
}

.fabric-group-btn:hover {
  color: var(--fabric-text-primary);
  background: var(--fabric-bg-elevated);
}

.fabric-group-btn--danger:hover {
  color: var(--fabric-red-500, #ef4444);
  background: color-mix(in srgb, var(--fabric-red-500, #ef4444) 12%, transparent);
}
</style>
