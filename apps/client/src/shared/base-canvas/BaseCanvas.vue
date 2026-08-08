<template>
  <div
    ref="canvasRef"
    class="base-canvas"
    :class="[
      `is-pattern-${patternStyle}`,
      { 'is-space-ready': isSpacePressed, 'is-panning': activePan },
    ]"
    :style="canvasStyle"
    @pointerdown="startCanvasPointer"
    @wheel.prevent="handleWheelZoom"
    @click="handleCanvasClick"
    @auxclick.prevent
    @contextmenu="handleCanvasContextMenu"
  >
    <BaseCanvasRulers
      v-if="rulers"
      :viewport="viewport"
      :grid-size="gridSize"
      :rulers-bg="rulersBg"
      :rulers-text="rulersText"
      :rulers-lines="rulersLines"
    />
    <div class="base-canvas__viewport" :style="viewportStyle">
      <slot />
      <div
        v-for="item in items"
        :key="item.id"
        class="base-canvas__item"
        :class="{ 'is-selected': selection.includes(item.id), 'is-locked': item.locked }"
        :data-base-canvas-item-id="item.id"
        :style="itemStyle(item)"
        @click.stop="handleItemClick(item.id)"
        @pointerdown.stop="handleItemPointerDown($event, item)"
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
    <div
      v-for="guide in activeAlignmentGuides"
      :key="`${guide.axis}:${guide.position}:${guide.start}:${guide.end}`"
      class="base-canvas__alignment-guide"
      :class="`base-canvas__alignment-guide--${guide.axis}`"
      :style="guideStyle(guide)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type {
  BaseCanvasItem,
  BaseCanvasContextMenuEvent,
  BaseCanvasItemDragEvent,
  BaseCanvasItemsMoveEvent,
  BaseCanvasMarqueeBorderStyle,
  BaseCanvasPatternStyle,
  BaseCanvasPoint,
  BaseCanvasRect,
  BaseCanvasViewport,
} from './types.ts'
import BaseCanvasRulers from './BaseCanvasRulers.vue'
import { getIncrementalDragDelta } from './drag.ts'
import { itemToRect, rectFromPoints, rectsIntersect } from './geometry.ts'
import { shouldBypassSnap } from './snap.ts'
import { screenToWorld } from './coordinates.ts'
import { snapRectToAlignment, type BaseCanvasAlignmentGuide } from './alignment.ts'

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
  patternSize?: number
  rulers?: boolean
  rulersBg?: string
  rulersText?: string
  rulersLines?: string
  contextMenu?: boolean
  minZoom?: number
  maxZoom?: number
  zoomSensitivity?: number
  viewportAnimationDuration?: number
}>(), {
  snapToGrid: true,
  gridSize: 16,
  marqueeSelection: true,
  marqueeBg: 'var(--fabric-base-canvas-selection-bg)',
  marqueeBorderStyle: 'dashed',
  marqueeBorderColor: 'var(--fabric-base-canvas-selection-border)',
  backgroundColor: 'var(--fabric-base-canvas-bg)',
  patternColor: 'var(--fabric-base-canvas-grid)',
  patternStyle: 'dot',
  patternSize: 16,
  rulers: false,
  rulersBg: 'var(--fabric-base-canvas-ruler-bg)',
  rulersText: 'var(--fabric-base-canvas-ruler-text)',
  rulersLines: 'var(--fabric-base-canvas-ruler-lines)',
  contextMenu: true,
  minZoom: 0.2,
  maxZoom: 3,
  zoomSensitivity: 0.0015,
  viewportAnimationDuration: 180,
})

const emit = defineEmits<{
  'update:viewport': [viewport: BaseCanvasViewport]
  'update:selection': [selection: string[]]
  'items-move': [event: BaseCanvasItemsMoveEvent]
  'item-drag-start': [event: BaseCanvasItemDragEvent]
  'item-drag-end': [event: BaseCanvasItemDragEvent]
  'canvas-click': [event: MouseEvent]
  'item-click': [itemId: string]
  'context-menu': [event: BaseCanvasContextMenuEvent]
}>()

const activeDrag = ref<{
  itemId: string
  itemIds: string[]
  start: BaseCanvasPoint
  previous: BaseCanvasPoint
  emitted: BaseCanvasPoint
  pointerId: number
  moved: boolean
} | null>(null)
const activePan = ref<{
  start: BaseCanvasPoint
  viewport: BaseCanvasViewport
  pointerId: number
  button: number
  moved: boolean
} | null>(null)
const activeMarquee = ref<{
  start: BaseCanvasPoint
  pointerId: number
  moved: boolean
} | null>(null)
const marqueeRect = ref<BaseCanvasRect | null>(null)
const activeAlignmentGuides = ref<BaseCanvasAlignmentGuide[]>([])
const isSpacePressed = ref(false)
const canvasRef = ref<HTMLElement | null>(null)
const suppressNextCanvasClick = ref(false)
const suppressNextItemClick = ref(false)
const suppressNextContextMenu = ref(false)
let viewportAnimationFrame: number | null = null

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

function guideStyle(guide: BaseCanvasAlignmentGuide) {
  if (guide.axis === 'x') {
    return {
      transform: `translate(${props.viewport.x + guide.position * props.viewport.zoom}px, ${props.viewport.y + guide.start * props.viewport.zoom}px)`,
      height: `${Math.max(1, (guide.end - guide.start) * props.viewport.zoom)}px`,
    }
  }
  return {
    transform: `translate(${props.viewport.x + guide.start * props.viewport.zoom}px, ${props.viewport.y + guide.position * props.viewport.zoom}px)`,
    width: `${Math.max(1, (guide.end - guide.start) * props.viewport.zoom)}px`,
  }
}

const canvasStyle = computed(() => ({
  backgroundColor: props.backgroundColor,
  '--base-canvas-pattern-color': props.patternColor,
  '--base-canvas-grid-size': `${props.gridSize}px`,
  backgroundImage: patternStyleValue.value,
  backgroundPosition: patternPositionValue.value,
  backgroundSize: patternSizeValue.value,
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

const patternPositionValue = computed(() => `${props.viewport.x}px ${props.viewport.y}px`)

const patternSizeValue = computed(() => {
  if (props.patternStyle === 'none') return undefined
  const size = Math.max(1, props.patternSize * props.viewport.zoom)
  return `${size}px ${size}px`
})

const marqueeBorderCss = computed(() => {
  if (props.marqueeBorderStyle === 'line') return 'solid'
  if (props.marqueeBorderStyle === 'dot') return 'dotted'
  return 'dashed'
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', stopActiveGestures)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('blur', stopActiveGestures)
  cancelViewportAnimation()
  stopActiveGestures()
})

function itemStyle(item: BaseCanvasItem) {
  return {
    width: item.width == null ? undefined : `${item.width}px`,
    height: item.height == null ? undefined : `${item.height}px`,
    transform: `translate(${item.x}px, ${item.y}px)`,
  }
}

function handleCanvasClick(event: MouseEvent) {
  if (suppressNextCanvasClick.value) {
    suppressNextCanvasClick.value = false
    return
  }
  emit('update:selection', [])
  emit('canvas-click', event)
}

function handleItemClick(itemId: string) {
  if (suppressNextItemClick.value) {
    suppressNextItemClick.value = false
    return
  }
  emit('update:selection', [itemId])
  emit('item-click', itemId)
}

function handleCanvasContextMenu(event: MouseEvent) {
  if (suppressNextContextMenu.value) {
    suppressNextContextMenu.value = false
    event.preventDefault()
    return
  }
  if (!props.contextMenu) return
  event.preventDefault()
  emit('context-menu', {
    screen: { x: event.clientX, y: event.clientY },
    world: screenToWorld(clientPointToCanvasPoint({ x: event.clientX, y: event.clientY }), props.viewport),
    target: { type: 'canvas' },
    selection: props.selection,
  })
}

function handleItemContextMenu(event: MouseEvent, itemId: string) {
  if (suppressNextContextMenu.value) {
    suppressNextContextMenu.value = false
    event.preventDefault()
    return
  }
  if (!props.contextMenu) return
  event.preventDefault()
  emit('context-menu', {
    screen: { x: event.clientX, y: event.clientY },
    world: screenToWorld(clientPointToCanvasPoint({ x: event.clientX, y: event.clientY }), props.viewport),
    target: { type: 'item', itemId },
    selection: props.selection,
  })
}

function startCanvasPointer(event: PointerEvent) {
  if (event.button === 1 || event.button === 2 || (event.button === 0 && isSpacePressed.value)) {
    startViewportPan(event)
    return
  }
  if (event.button !== 0) return
  startMarqueeSelection(event)
}

function handleItemPointerDown(event: PointerEvent, item: BaseCanvasItem) {
  if (event.button === 1 || event.button === 2 || (event.button === 0 && isSpacePressed.value)) {
    startViewportPan(event)
    return
  }
  startItemDrag(event, item)
}

function startViewportPan(event: PointerEvent) {
  event.preventDefault()
  cancelViewportAnimation()
  activePan.value = {
    start: { x: event.clientX, y: event.clientY },
    viewport: { ...props.viewport },
    pointerId: event.pointerId,
    button: event.button,
    moved: false,
  }
  window.addEventListener('pointermove', moveViewport)
  window.addEventListener('pointerup', stopViewportPan, { once: true })
  window.addEventListener('pointercancel', stopViewportPan, { once: true })
}

function moveViewport(event: PointerEvent) {
  const pan = activePan.value
  if (!pan || event.pointerId !== pan.pointerId) return
  pan.moved = pan.moved || Math.hypot(event.clientX - pan.start.x, event.clientY - pan.start.y) >= 3
  if (pan.moved && pan.button === 2) suppressNextContextMenu.value = true
  emit('update:viewport', {
    ...pan.viewport,
    x: pan.viewport.x + event.clientX - pan.start.x,
    y: pan.viewport.y + event.clientY - pan.start.y,
  })
}

function stopViewportPan(event?: PointerEvent) {
  const pan = activePan.value
  if (event?.type === 'pointerup' && pan?.moved && pan.button === 0) suppressNextCanvasClick.value = true
  if (event?.type === 'pointerup' && pan?.moved && pan.button === 2) suppressNextContextMenu.value = true
  activePan.value = null
  window.removeEventListener('pointermove', moveViewport)
  window.removeEventListener('pointercancel', stopViewportPan)
}

function handleWheelZoom(event: WheelEvent) {
  cancelViewportAnimation()
  const canvasPoint = clientPointToCanvasPoint({ x: event.clientX, y: event.clientY })
  const worldBeforeZoom = screenToWorld(canvasPoint, props.viewport)
  const zoomFactor = Math.exp(-event.deltaY * props.zoomSensitivity)
  const nextZoom = clampZoom(props.viewport.zoom * zoomFactor)
  emit('update:viewport', {
    ...props.viewport,
    x: canvasPoint.x - worldBeforeZoom.x * nextZoom,
    y: canvasPoint.y - worldBeforeZoom.y * nextZoom,
    zoom: nextZoom,
  })
}

function startItemDrag(event: PointerEvent, item: BaseCanvasItem) {
  if (event.button !== 0) return
  if (item.locked) return
  if ((event.target as Element | null)?.closest('[data-base-canvas-no-drag]')) return
  event.preventDefault()
  const selectedItemIds = props.selection.includes(item.id) ? props.selection : [item.id]
  const draggableItemIds = selectedItemIds.filter((itemId) => {
    const candidate = props.items.find((item) => item.id === itemId)
    return candidate && !candidate.locked
  })
  activeDrag.value = {
    itemId: item.id,
    itemIds: draggableItemIds.length ? draggableItemIds : [item.id],
    start: { x: event.clientX, y: event.clientY },
    previous: { x: event.clientX, y: event.clientY },
    emitted: { x: 0, y: 0 },
    pointerId: event.pointerId,
    moved: false,
  }
  emit('item-drag-start', { itemId: item.id })
  window.addEventListener('pointermove', moveItem)
  window.addEventListener('pointerup', stopItemDrag, { once: true })
  window.addEventListener('pointercancel', stopItemDrag, { once: true })
}

function moveItem(event: PointerEvent) {
  const drag = activeDrag.value
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
  const item = props.items.find((candidate) => candidate.id === drag.itemId)
  const isGroupDrag = drag.itemIds.length > 1
  const alignment = item && !isGroupDrag && !shouldBypassSnap(event)
    ? snapRectToAlignment({
      rect: {
        x: item.x + delta.x,
        y: item.y + delta.y,
        width: item.width ?? 0,
        height: item.height ?? 0,
      },
      targets: props.items.filter((candidate) => !drag.itemIds.includes(candidate.id)).map(itemToRect),
    })
    : { delta: { x: 0, y: 0 }, guides: [] }
  drag.previous = nextPrevious
  drag.emitted = nextEmitted
  drag.moved = drag.moved || Math.hypot(event.clientX - drag.start.x, event.clientY - drag.start.y) >= 3
  activeAlignmentGuides.value = alignment.guides
  emit('items-move', {
    itemIds: drag.itemIds,
    delta: { x: delta.x + alignment.delta.x, y: delta.y + alignment.delta.y },
  })
}

function stopItemDrag() {
  const drag = activeDrag.value
  if (drag?.moved) suppressNextItemClick.value = true
  activeDrag.value = null
  activeAlignmentGuides.value = []
  window.removeEventListener('pointermove', moveItem)
  window.removeEventListener('pointercancel', stopItemDrag)
  if (drag) emit('item-drag-end', { itemId: drag.itemId })
}

function startMarqueeSelection(event: PointerEvent) {
  if (!props.marqueeSelection) return
  const start = clientPointToCanvasPoint({ x: event.clientX, y: event.clientY })
  activeMarquee.value = {
    start,
    pointerId: event.pointerId,
    moved: false,
  }
  marqueeRect.value = rectFromPoints(activeMarquee.value.start, activeMarquee.value.start)
  window.addEventListener('pointermove', moveMarqueeSelection)
  window.addEventListener('pointerup', stopMarqueeSelection, { once: true })
  window.addEventListener('pointercancel', stopMarqueeSelection, { once: true })
}

function moveMarqueeSelection(event: PointerEvent) {
  const marquee = activeMarquee.value
  if (!marquee || event.pointerId !== marquee.pointerId) return
  const current = clientPointToCanvasPoint({ x: event.clientX, y: event.clientY })
  if (Math.hypot(current.x - marquee.start.x, current.y - marquee.start.y) >= 3) {
    marquee.moved = true
  }
  const rect = rectFromPoints(marquee.start, current)
  marqueeRect.value = rect
  const selected = props.items
    .filter((item) => rectsIntersect(screenRectToWorld(rect), itemToRect(item)))
    .map((item) => item.id)
  emit('update:selection', selected)
}

function stopMarqueeSelection(event?: PointerEvent) {
  if (event?.type === 'pointerup' && activeMarquee.value?.moved) suppressNextCanvasClick.value = true
  activeMarquee.value = null
  marqueeRect.value = null
  window.removeEventListener('pointermove', moveMarqueeSelection)
  window.removeEventListener('pointercancel', stopMarqueeSelection)
}

function stopActiveGestures() {
  stopItemDrag()
  stopViewportPan()
  stopMarqueeSelection()
  isSpacePressed.value = false
}

function animateViewportTo(target: BaseCanvasViewport, duration = props.viewportAnimationDuration) {
  cancelViewportAnimation()
  if (duration <= 0) {
    emit('update:viewport', target)
    return
  }

  const start = { ...props.viewport }
  let startedAt: number | null = null
  const animate = (timestamp: number) => {
    startedAt ??= timestamp
    const progress = Math.min(1, (timestamp - startedAt) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    emit('update:viewport', {
      x: start.x + (target.x - start.x) * eased,
      y: start.y + (target.y - start.y) * eased,
      zoom: start.zoom + (target.zoom - start.zoom) * eased,
    })
    viewportAnimationFrame = progress < 1 ? requestAnimationFrame(animate) : null
  }
  viewportAnimationFrame = requestAnimationFrame(animate)
}

function cancelViewportAnimation() {
  if (viewportAnimationFrame === null) return
  cancelAnimationFrame(viewportAnimationFrame)
  viewportAnimationFrame = null
}

function screenRectToWorld(rect: BaseCanvasRect): BaseCanvasRect {
  return {
    x: (rect.x - props.viewport.x) / props.viewport.zoom,
    y: (rect.y - props.viewport.y) / props.viewport.zoom,
    width: rect.width / props.viewport.zoom,
    height: rect.height / props.viewport.zoom,
  }
}

function clientPointToCanvasPoint(point: BaseCanvasPoint): BaseCanvasPoint {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return point
  return {
    x: point.x - rect.left,
    y: point.y - rect.top,
  }
}

function clampZoom(zoom: number) {
  return Math.min(props.maxZoom, Math.max(props.minZoom, zoom))
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.code !== 'Space') return
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
  event.preventDefault()
  isSpacePressed.value = true
}

defineExpose({ animateViewportTo })

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
  user-select: none;
}

.base-canvas.is-space-ready,
.base-canvas.is-space-ready :deep(*) {
  cursor: grab !important;
}

.base-canvas.is-panning,
.base-canvas.is-panning :deep(*) {
  cursor: grabbing !important;
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
  user-select: none;
  -webkit-user-drag: none;
}

.base-canvas__item :deep(img),
.base-canvas__item :deep(svg) {
  -webkit-user-drag: none;
}

.base-canvas__marquee {
  position: absolute;
  pointer-events: none;
}

.base-canvas__alignment-guide {
  position: absolute;
  z-index: 20;
  pointer-events: none;
  background: var(--fabric-base-canvas-alignment-guide-bg);
  box-shadow: 0 0 0 1px var(--fabric-base-canvas-alignment-guide-shadow);
}

.base-canvas__alignment-guide--x {
  width: 1px;
}

.base-canvas__alignment-guide--y {
  height: 1px;
}
</style>
