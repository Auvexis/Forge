<template>
  <div v-if="showBox" class="web-page-blueprint-selection-box" data-page-blueprint-selection-box>
    <div
      class="web-page-blueprint-selection-box__outer"
      :style="outerBoxStyle"
      @pointerdown.stop="startSelectionDrag"
    >
      <div class="web-page-blueprint-selection-box__inner" />
    </div>

    <div class="web-page-blueprint-selection-box__toolbar" :style="toolbarStyle">
      <span class="web-page-blueprint-selection-box__count">
        <LucideIcon name="layers" :size="12" />
        {{ selectedItems.length }} nodes selected
      </span>
      <div class="web-page-blueprint-selection-box__divider" />
      <button
        v-if="canUngroup"
        class="web-page-blueprint-selection-box__button"
        type="button"
        title="Ungroup"
        @click.stop="$emit('ungroup')"
      >
        <LucideIcon name="ungroup" :size="13" />
        <span>Ungroup</span>
      </button>
      <button
        class="web-page-blueprint-selection-box__button"
        type="button"
        title="Create group"
        @click.stop="$emit('createGroup')"
      >
        <LucideIcon name="group" :size="13" />
        <span>Group</span>
      </button>
      <button
        class="web-page-blueprint-selection-box__button"
        type="button"
        title="Create component"
        @click.stop="$emit('createComponent')"
      >
        <LucideIcon name="component" :size="13" />
        <span>Component</span>
      </button>
      <button
        class="web-page-blueprint-selection-box__button"
        type="button"
        title="Duplicate selected utility nodes"
        @click.stop="$emit('duplicateSelection')"
      >
        <LucideIcon name="copy" :size="13" />
      </button>
      <button
        class="web-page-blueprint-selection-box__button web-page-blueprint-selection-box__button--danger"
        type="button"
        title="Delete selected nodes"
        @click.stop="$emit('deleteSelection')"
      >
        <LucideIcon name="trash-2" :size="13" />
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

const props = withDefaults(defineProps<{
  items: BaseCanvasItem[]
  selection: string[]
  viewport: BaseCanvasViewport
  gridSize?: number
  snapToGrid?: boolean
  canUngroup?: boolean
}>(), {
  gridSize: 24,
  snapToGrid: true,
  canUngroup: false,
})

const emit = defineEmits<{
  createGroup: []
  ungroup: []
  createComponent: []
  duplicateSelection: []
  deleteSelection: []
  selectionDragStart: []
  selectionDragEnd: []
  selectionMove: [event: BaseCanvasItemsMoveEvent]
}>()

const PADDING_TOP = 24
const PADDING_BOTTOM = 52
const PADDING_LEFT = 22
const PADDING_RIGHT = 22
const TOOLBAR_H = 34

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
    gridSize: props.gridSize,
    snapToGrid: props.snapToGrid,
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
.web-page-blueprint-selection-box {
  position: absolute;
  inset: 0;
  z-index: 7;
  pointer-events: none;
}

.web-page-blueprint-selection-box__outer {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  border: 2px dashed color-mix(in srgb, var(--fabric-accent) 32%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--fabric-accent) 4%, transparent);
  cursor: move;
  pointer-events: auto;
}

.web-page-blueprint-selection-box__inner {
  position: absolute;
  inset: 4px;
  border: 1px solid color-mix(in srgb, var(--fabric-accent) 64%, transparent);
  border-radius: 4px;
  pointer-events: none;
}

.web-page-blueprint-selection-box__toolbar {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 7px;
  border: 1px solid var(--fabric-border);
  border-radius: 3px;
  background: var(--fabric-bg-surface);
  box-shadow: var(--fabric-shadow-md), 0 0 0 1px color-mix(in srgb, var(--fabric-accent) 20%, transparent);
  white-space: nowrap;
  pointer-events: auto;
}

.web-page-blueprint-selection-box__count,
.web-page-blueprint-selection-box__button {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
}

.web-page-blueprint-selection-box__count {
  color: var(--fabric-text-secondary);
}

.web-page-blueprint-selection-box__divider {
  width: 1px;
  height: 18px;
  margin: 0 2px;
  background: var(--fabric-border);
}

.web-page-blueprint-selection-box__button {
  height: 24px;
  padding: 0 7px;
  color: var(--fabric-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 3px;
  transition: background 0.15s ease, color 0.15s ease;
}

.web-page-blueprint-selection-box__button:hover {
  color: var(--fabric-text-primary);
  background: var(--fabric-bg-elevated);
}

.web-page-blueprint-selection-box__button--danger:hover {
  color: var(--fabric-text-error);
  background: color-mix(in srgb, var(--fabric-text-error) 12%, transparent);
}
</style>
