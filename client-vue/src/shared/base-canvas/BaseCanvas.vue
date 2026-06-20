<template>
  <div
    class="base-canvas"
    @click.self="handleCanvasClick"
  >
    <div class="base-canvas__viewport" :style="viewportStyle">
      <div
        v-for="item in items"
        :key="item.id"
        class="base-canvas__item"
        :class="{ 'is-selected': selection.includes(item.id), 'is-locked': item.locked }"
        :data-base-canvas-item-id="item.id"
        :style="itemStyle(item)"
        @click.stop="handleItemClick(item.id)"
        @pointerdown.stop="startItemDrag($event, item)"
      >
        <slot name="item" :item="item" :selected="selection.includes(item.id)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  BaseCanvasItem,
  BaseCanvasItemsMoveEvent,
  BaseCanvasPoint,
  BaseCanvasViewport,
} from './types.ts'
import { snapDeltaToGrid, shouldBypassSnap } from './snap.ts'

const props = withDefaults(defineProps<{
  items: BaseCanvasItem[]
  selection: string[]
  viewport: BaseCanvasViewport
  snapToGrid?: boolean
  gridSize?: number
}>(), {
  snapToGrid: true,
  gridSize: 16,
})

const emit = defineEmits<{
  'update:viewport': [viewport: BaseCanvasViewport]
  'update:selection': [selection: string[]]
  'items-move': [event: BaseCanvasItemsMoveEvent]
  'canvas-click': [event: MouseEvent]
  'item-click': [itemId: string]
}>()

const activeDrag = ref<{
  itemId: string
  start: BaseCanvasPoint
  pointerId: number
} | null>(null)

const viewportStyle = computed(() => ({
  transform: `translate(${props.viewport.x}px, ${props.viewport.y}px) scale(${props.viewport.zoom})`,
}))

function itemStyle(item: BaseCanvasItem) {
  return {
    width: item.width == null ? undefined : `${item.width}px`,
    height: item.height == null ? undefined : `${item.height}px`,
    transform: `translate(${item.x}px, ${item.y}px)`,
  }
}

function handleCanvasClick(event: MouseEvent) {
  emit('update:selection', [])
  emit('canvas-click', event)
}

function handleItemClick(itemId: string) {
  emit('update:selection', [itemId])
  emit('item-click', itemId)
}

function startItemDrag(event: PointerEvent, item: BaseCanvasItem) {
  if (item.locked) return
  activeDrag.value = {
    itemId: item.id,
    start: { x: event.clientX, y: event.clientY },
    pointerId: event.pointerId,
  }
  window.addEventListener('pointermove', moveItem)
  window.addEventListener('pointerup', stopItemDrag, { once: true })
}

function moveItem(event: PointerEvent) {
  const drag = activeDrag.value
  if (!drag || event.pointerId !== drag.pointerId) return
  const rawDelta = {
    x: (event.clientX - drag.start.x) / props.viewport.zoom,
    y: (event.clientY - drag.start.y) / props.viewport.zoom,
  }
  const delta = props.snapToGrid && !shouldBypassSnap(event)
    ? snapDeltaToGrid(rawDelta, props.gridSize)
    : rawDelta
  emit('items-move', { itemIds: [drag.itemId], delta })
}

function stopItemDrag() {
  activeDrag.value = null
  window.removeEventListener('pointermove', moveItem)
}
</script>

<style scoped>
.base-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
}

.base-canvas__viewport {
  position: absolute;
  inset: 0;
  transform-origin: 0 0;
}

.base-canvas__item {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
}
</style>
