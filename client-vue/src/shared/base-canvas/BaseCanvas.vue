<template>
  <div
    class="base-canvas"
    :class="`is-pattern-${patternStyle}`"
    :style="canvasStyle"
    @pointerdown="startCanvasPointer"
    @click.self="handleCanvasClick"
    @contextmenu="handleCanvasContextMenu"
  >
    <BaseCanvasRulers
      v-if="rulers"
      :viewport="viewport"
      :grid-size="gridSize"
    />
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
        @contextmenu.stop="handleItemContextMenu($event, item.id)"
      >
        <slot name="item" :item="item" :selected="selection.includes(item.id)" />
      </div>
    </div>
    <div
      v-if="marqueeRect"
      class="base-canvas__marquee"
      :style="marqueeStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type {
  BaseCanvasItem,
  BaseCanvasContextMenuEvent,
  BaseCanvasItemsMoveEvent,
  BaseCanvasMarqueeBorderStyle,
  BaseCanvasPatternStyle,
  BaseCanvasPoint,
  BaseCanvasRect,
  BaseCanvasViewport,
} from './types.ts'
import BaseCanvasRulers from './BaseCanvasRulers.vue'
import { itemToRect, rectFromPoints, rectsIntersect } from './geometry.ts'
import { snapDeltaToGrid, shouldBypassSnap } from './snap.ts'
import { screenToWorld } from './coordinates.ts'

const props = withDefaults(defineProps<{
  items: BaseCanvasItem[]
  selection: string[]
  viewport: BaseCanvasViewport
  snapToGrid?: boolean
  gridSize?: number
  marqueeSelection?: boolean
  marqueeBg?: string
  marqueeBorderStyle?: BaseCanvasMarqueeBorderStyle
  marqueeBorderColor?: string
  backgroundColor?: string
  patternColor?: string
  patternStyle?: BaseCanvasPatternStyle
  rulers?: boolean
  contextMenu?: boolean
}>(), {
  snapToGrid: true,
  gridSize: 16,
  marqueeSelection: true,
  marqueeBg: 'rgba(59, 130, 246, 0.12)',
  marqueeBorderStyle: 'dashed',
  marqueeBorderColor: 'rgba(96, 165, 250, 0.85)',
  backgroundColor: '#0b0b0d',
  patternColor: 'rgba(255, 255, 255, 0.08)',
  patternStyle: 'dot',
  rulers: false,
  contextMenu: true,
})

const emit = defineEmits<{
  'update:viewport': [viewport: BaseCanvasViewport]
  'update:selection': [selection: string[]]
  'items-move': [event: BaseCanvasItemsMoveEvent]
  'canvas-click': [event: MouseEvent]
  'item-click': [itemId: string]
  'context-menu': [event: BaseCanvasContextMenuEvent]
}>()

const activeDrag = ref<{
  itemId: string
  start: BaseCanvasPoint
  pointerId: number
} | null>(null)
const activePan = ref<{
  start: BaseCanvasPoint
  viewport: BaseCanvasViewport
  pointerId: number
} | null>(null)
const activeMarquee = ref<{
  start: BaseCanvasPoint
  pointerId: number
} | null>(null)
const marqueeRect = ref<BaseCanvasRect | null>(null)
const isSpacePressed = ref(false)

const viewportStyle = computed(() => ({
  transform: `translate(${props.viewport.x}px, ${props.viewport.y}px) scale(${props.viewport.zoom})`,
}))

const marqueeStyle = computed(() => {
  if (!marqueeRect.value) return {}
  return {
    left: `${marqueeRect.value.x}px`,
    top: `${marqueeRect.value.y}px`,
    width: `${marqueeRect.value.width}px`,
    height: `${marqueeRect.value.height}px`,
    background: props.marqueeBg,
    border: `1px ${marqueeBorderCss.value} ${props.marqueeBorderColor}`,
  }
})

const canvasStyle = computed(() => ({
  backgroundColor: props.backgroundColor,
  '--base-canvas-pattern-color': props.patternColor,
  '--base-canvas-grid-size': `${props.gridSize}px`,
  backgroundImage: patternStyleValue.value,
  backgroundSize: props.patternStyle === 'none' ? undefined : `${props.gridSize}px ${props.gridSize}px`,
}))

const patternStyleValue = computed(() => {
  if (props.patternStyle === 'none') return 'none'
  if (props.patternStyle === 'square') {
    return [
      'linear-gradient(var(--base-canvas-pattern-color) 1px, transparent 1px)',
      'linear-gradient(90deg, var(--base-canvas-pattern-color) 1px, transparent 1px)',
    ].join(', ')
  }
  return 'radial-gradient(circle, var(--base-canvas-pattern-color) 1px, transparent 1px)'
})

const marqueeBorderCss = computed(() => {
  if (props.marqueeBorderStyle === 'line') return 'solid'
  if (props.marqueeBorderStyle === 'dot') return 'dotted'
  return 'dashed'
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  stopItemDrag()
  stopViewportPan()
  stopMarqueeSelection()
})

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

function handleCanvasContextMenu(event: MouseEvent) {
  if (!props.contextMenu) return
  event.preventDefault()
  emit('context-menu', {
    screen: { x: event.clientX, y: event.clientY },
    world: screenToWorld({ x: event.clientX, y: event.clientY }, props.viewport),
    target: { type: 'canvas' },
    selection: props.selection,
  })
}

function handleItemContextMenu(event: MouseEvent, itemId: string) {
  if (!props.contextMenu) return
  event.preventDefault()
  emit('context-menu', {
    screen: { x: event.clientX, y: event.clientY },
    world: screenToWorld({ x: event.clientX, y: event.clientY }, props.viewport),
    target: { type: 'item', itemId },
    selection: props.selection,
  })
}

function startCanvasPointer(event: PointerEvent) {
  if (event.button === 1 || (event.button === 0 && isSpacePressed.value)) {
    startViewportPan(event)
    return
  }
  if (event.button !== 0) return
  startMarqueeSelection(event)
}

function startViewportPan(event: PointerEvent) {
  activePan.value = {
    start: { x: event.clientX, y: event.clientY },
    viewport: { ...props.viewport },
    pointerId: event.pointerId,
  }
  window.addEventListener('pointermove', moveViewport)
  window.addEventListener('pointerup', stopViewportPan, { once: true })
}

function moveViewport(event: PointerEvent) {
  const pan = activePan.value
  if (!pan || event.pointerId !== pan.pointerId) return
  emit('update:viewport', {
    ...pan.viewport,
    x: pan.viewport.x + event.clientX - pan.start.x,
    y: pan.viewport.y + event.clientY - pan.start.y,
  })
}

function stopViewportPan() {
  activePan.value = null
  window.removeEventListener('pointermove', moveViewport)
}

function startItemDrag(event: PointerEvent, item: BaseCanvasItem) {
  if (event.button !== 0) return
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

function startMarqueeSelection(event: PointerEvent) {
  if (!props.marqueeSelection) return
  activeMarquee.value = {
    start: { x: event.clientX, y: event.clientY },
    pointerId: event.pointerId,
  }
  marqueeRect.value = rectFromPoints(activeMarquee.value.start, activeMarquee.value.start)
  window.addEventListener('pointermove', moveMarqueeSelection)
  window.addEventListener('pointerup', stopMarqueeSelection, { once: true })
}

function moveMarqueeSelection(event: PointerEvent) {
  const marquee = activeMarquee.value
  if (!marquee || event.pointerId !== marquee.pointerId) return
  const rect = rectFromPoints(marquee.start, { x: event.clientX, y: event.clientY })
  marqueeRect.value = rect
  const selected = props.items
    .filter((item) => rectsIntersect(screenRectToWorld(rect), itemToRect(item)))
    .map((item) => item.id)
  emit('update:selection', selected)
}

function stopMarqueeSelection() {
  activeMarquee.value = null
  marqueeRect.value = null
  window.removeEventListener('pointermove', moveMarqueeSelection)
}

function screenRectToWorld(rect: BaseCanvasRect): BaseCanvasRect {
  return {
    x: (rect.x - props.viewport.x) / props.viewport.zoom,
    y: (rect.y - props.viewport.y) / props.viewport.zoom,
    width: rect.width / props.viewport.zoom,
    height: rect.height / props.viewport.zoom,
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.code === 'Space') isSpacePressed.value = true
}

function handleKeyUp(event: KeyboardEvent) {
  if (event.code === 'Space') isSpacePressed.value = false
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

.base-canvas__marquee {
  position: absolute;
  pointer-events: none;
}
</style>
