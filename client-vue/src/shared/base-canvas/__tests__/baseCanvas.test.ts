import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getRulerTicks,
  itemToRect,
  rectFromPoints,
  rectsIntersect,
  screenToWorld,
  shouldBypassSnap,
  snapPointToGrid,
  getIncrementalDragDelta,
  snapRectToAlignment,
  worldToScreen,
} from '../index.ts'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

describe('base canvas coordinate helpers', () => {
  it('converts points between screen and world coordinates', () => {
    const viewport = { x: 100, y: 50, zoom: 2 }
    const world = screenToWorld({ x: 140, y: 90 }, viewport)
    const screen = worldToScreen(world, viewport)

    assert.deepEqual(world, { x: 20, y: 20 })
    assert.deepEqual(screen, { x: 140, y: 90 })
  })
})

describe('base canvas snap helpers', () => {
  it('rounds points to the nearest grid coordinate', () => {
    assert.deepEqual(snapPointToGrid({ x: 23, y: 25 }, 16), { x: 16, y: 32 })
  })

  it('bypasses snap when Ctrl is pressed', () => {
    assert.equal(shouldBypassSnap({ ctrlKey: true, shiftKey: false }), true)
  })

  it('bypasses snap when Shift is pressed', () => {
    assert.equal(shouldBypassSnap({ ctrlKey: false, shiftKey: true }), true)
  })

  it('snaps rectangle edges and centers to nearby alignment targets', () => {
    const result = snapRectToAlignment({
      rect: { x: 98, y: 10, width: 50, height: 40 },
      targets: [{ x: 100, y: 80, width: 50, height: 40 }],
      threshold: 6,
    })

    assert.deepEqual(result.delta, { x: 2, y: 0 })
    assert.equal(result.guides.some((guide) => guide.axis === 'x' && guide.position === 100), true)
  })
})

describe('base canvas drag helpers', () => {
  it('emits incremental drag deltas instead of replaying the total distance', () => {
    const first = getIncrementalDragDelta({
      start: { x: 10, y: 10 },
      previous: { x: 10, y: 10 },
      current: { x: 42, y: 26 },
      zoom: 2,
      gridSize: 16,
      snapToGrid: false,
      bypassSnap: false,
    })
    const second = getIncrementalDragDelta({
      start: { x: 10, y: 10 },
      previous: { x: 42, y: 26 },
      current: { x: 58, y: 42 },
      zoom: 2,
      gridSize: 16,
      snapToGrid: false,
      bypassSnap: false,
    })

    assert.deepEqual(first.delta, { x: 16, y: 8 })
    assert.deepEqual(first.nextPrevious, { x: 42, y: 26 })
    assert.deepEqual(second.delta, { x: 8, y: 8 })
    assert.deepEqual(second.nextPrevious, { x: 58, y: 42 })
  })

  it('accumulates snapped drag distance so small pointer moves do not strand the node', () => {
    const first = getIncrementalDragDelta({
      start: { x: 0, y: 0 },
      previous: { x: 0, y: 0 },
      current: { x: 7, y: 0 },
      emitted: { x: 0, y: 0 },
      zoom: 1,
      gridSize: 20,
      snapToGrid: true,
      bypassSnap: false,
    })
    const second = getIncrementalDragDelta({
      start: { x: 0, y: 0 },
      previous: { x: 7, y: 0 },
      current: { x: 13, y: 0 },
      emitted: first.nextEmitted,
      zoom: 1,
      gridSize: 20,
      snapToGrid: true,
      bypassSnap: false,
    })

    assert.deepEqual(first.delta, { x: 0, y: 0 })
    assert.deepEqual(second.delta, { x: 20, y: 0 })
    assert.deepEqual(second.nextEmitted, { x: 20, y: 0 })
  })
})

describe('base canvas marquee helpers', () => {
  it('finds items intersecting a marquee rectangle', () => {
    const marquee = rectFromPoints({ x: 0, y: 0 }, { x: 100, y: 100 })

    assert.equal(rectsIntersect(marquee, itemToRect({ x: 80, y: 80, width: 40, height: 40 })), true)
    assert.equal(rectsIntersect(marquee, itemToRect({ x: 140, y: 140, width: 20, height: 20 })), false)
  })
})

describe('base canvas ruler helpers', () => {
  it('derives visible ruler ticks from viewport and zoom', () => {
    const ticks = getRulerTicks({
      axis: 'x',
      viewport: { x: -32, y: 0, zoom: 2 },
      length: 96,
      gridSize: 16,
    })

    assert.deepEqual(ticks.map((tick) => tick.value), [16, 32, 48, 64])
    assert.deepEqual(ticks.map((tick) => tick.position), [0, 32, 64, 96])
  })
})

describe('BaseCanvas component contract', () => {
  it('renders generic items through a slot and emits base interaction events', () => {
    const source = readBaseCanvas()

    assert.match(source, /defineProps<\{[\s\S]*items: BaseCanvasItem\[\]/)
    assert.match(source, /defineEmits<\{[\s\S]*'update:viewport'/)
    assert.match(source, /'update:selection'/)
    assert.match(source, /'items-move'/)
    assert.match(source, /'canvas-click'/)
    assert.match(source, /'item-click'/)
    assert.match(source, /<slot name="item" :item="item"/)
    assert.match(source, /data-base-canvas-item-id/)
    assert.match(source, /transform: `translate\(\$\{item\.x}px, \$\{item\.y}px\)`/)
  })

  it('keeps pan, drag, and marquee gestures separated', () => {
    const source = readBaseCanvas()

    assert.match(source, /function startCanvasPointer/)
    assert.match(source, /function handleItemPointerDown/)
    assert.match(source, /@pointerdown\.stop="handleItemPointerDown\(\$event, item\)"/)
    assert.match(source, /event\.button === 1/)
    assert.match(source, /isSpacePressed\.value/)
    assert.match(source, /startViewportPan/)
    assert.match(source, /startMarqueeSelection/)
    assert.match(source, /if \(event\.button !== 0\) return/)
    assert.match(source, /emit\('update:viewport'/)
    assert.match(source, /shouldBypassSnap\(event\)/)
    assert.match(source, /snapRectToAlignment/)
    assert.match(source, /activeAlignmentGuides/)
    assert.match(source, /if \(item\.locked\) return/)
    assert.match(source, /rectsIntersect/)
    assert.match(source, /pointercancel/)
    assert.match(source, /stopActiveGestures/)
    assert.match(source, /window\.addEventListener\('blur', stopActiveGestures\)/)
  })

  it('preserves marquee selection through the synthetic canvas click', () => {
    const source = readBaseCanvas()

    assert.match(source, /suppressNextCanvasClick/)
    assert.match(source, /moved: false/)
    assert.match(source, /marquee\.moved = true/)
    assert.match(source, /if \(suppressNextCanvasClick\.value\)/)
  })

  it('clears selection from any empty viewport area', () => {
    const source = readBaseCanvas()

    assert.match(source, /@click="handleCanvasClick"/)
    assert.doesNotMatch(source, /@click\.self="handleCanvasClick"/)
  })

  it('exposes grab and grabbing cursor states for keyboard and pointer pan', () => {
    const source = readBaseCanvas()

    assert.match(source, /'is-space-ready': isSpacePressed/)
    assert.match(source, /'is-panning': activePan/)
    assert.match(source, /\.base-canvas\.is-space-ready :deep\(\*\)[\s\S]*cursor: grab/)
    assert.match(source, /\.base-canvas\.is-panning :deep\(\*\)[\s\S]*cursor: grabbing/)
  })

  it('exposes cancellable animated viewport updates for programmatic controls', () => {
    const source = readBaseCanvas()

    assert.match(source, /viewportAnimationDuration\?: number/)
    assert.match(source, /function animateViewportTo/)
    assert.match(source, /requestAnimationFrame/)
    assert.match(source, /cancelViewportAnimation/)
    assert.match(source, /defineExpose\(\{[\s\S]*animateViewportTo/)
  })

  it('prevents native content selection while dragging canvas items', () => {
    const source = readBaseCanvas()

    assert.match(source, /event\.preventDefault\(\)/)
    assert.match(source, /user-select: none/)
    assert.match(source, /-webkit-user-drag: none/)
  })

  it('renders alignment guide overlays during item movement', () => {
    const source = readBaseCanvas()

    assert.match(source, /base-canvas__alignment-guide/)
    assert.match(source, /guideStyle/)
    assert.match(source, /activeAlignmentGuides/)
  })

  it('supports visual marquee, background pattern, and passive rulers', () => {
    const source = readBaseCanvas()
    const ruler = readBaseCanvasRulers()

    assert.match(source, /marqueeBg\?: string/)
    assert.match(source, /marqueeBorderStyle\?: BaseCanvasMarqueeBorderStyle/)
    assert.match(source, /marqueeBorderColor\?: string/)
    assert.match(source, /backgroundColor\?: string/)
    assert.match(source, /patternColor\?: string/)
    assert.match(source, /patternStyle\?: BaseCanvasPatternStyle/)
    assert.match(source, /patternSize\?: number/)
    assert.match(source, /rulers\?: boolean/)
    assert.match(source, /rulersBg\?: string/)
    assert.match(source, /rulersText\?: string/)
    assert.match(source, /rulersLines\?: string/)
    assert.match(source, /canvasStyle/)
    assert.match(source, /patternStyleValue/)
    assert.match(source, /patternPositionValue/)
    assert.match(source, /patternSizeValue/)
    assert.match(source, /BaseCanvasRulers/)
    assert.match(source, /marqueeBorderCss/)
    assert.match(ruler, /axis="x"/)
    assert.match(ruler, /axis="y"/)
    assert.doesNotMatch(ruler, /backgroundColor: props\.rulersBg/)
    assert.match(ruler, /context\.fillStyle = resolveCanvasColor\(canvas, props\.rulersBg\)/)
    assert.match(ruler, /context\.fillRect\(0, 0, width, height\)/)
    assert.match(ruler, /context\.strokeStyle = resolveCanvasColor\(canvas, props\.rulersLines\)/)
    assert.match(ruler, /context\.fillStyle = resolveCanvasColor\(canvas, props\.rulersText\)/)
    assert.match(ruler, /getComputedStyle/)
    assert.match(ruler, /getRulerTicks/)
    assert.doesNotMatch(ruler, /rgba\(17, 17, 17,/)
    assert.doesNotMatch(ruler, /items/)
  })

  it('redraws rulers when theme attributes change without requiring reload', () => {
    const ruler = readBaseCanvasRulers()

    assert.match(ruler, /MutationObserver/)
    assert.match(ruler, /themeObserver/)
    assert.match(ruler, /document\.documentElement/)
    assert.match(ruler, /attributeFilter: \['class', 'style', 'data-theme'\]/)
    assert.match(ruler, /themeObserver\.value\?\.disconnect\(\)/)
  })

  it('zooms with the mouse wheel around the cursor and keeps the pattern attached to the viewport', () => {
    const source = readBaseCanvas()

    assert.match(source, /@wheel\.prevent="handleWheelZoom"/)
    assert.match(source, /zoomSensitivity\?: number/)
    assert.match(source, /minZoom\?: number/)
    assert.match(source, /maxZoom\?: number/)
    assert.match(source, /function handleWheelZoom\(event: WheelEvent\)/)
    assert.match(source, /const nextZoom = clampZoom/)
    assert.match(source, /const worldBeforeZoom = screenToWorld\(canvasPoint, props\.viewport\)/)
    assert.match(source, /zoom: nextZoom/)
    assert.match(source, /backgroundPosition: patternPositionValue\.value/)
    assert.match(source, /backgroundSize: patternSizeValue\.value/)
    assert.match(source, /`\$\{props\.viewport\.x\}px \$\{props\.viewport\.y\}px`/)
    assert.match(source, /props\.patternSize \* props\.viewport\.zoom/)
  })

  it('emits generic context menu events without rendering menu UI', () => {
    const source = readBaseCanvas()

    assert.match(source, /contextMenu\?: boolean/)
    assert.match(source, /BaseCanvasContextMenuEvent/)
    assert.match(source, /'context-menu': \[event: BaseCanvasContextMenuEvent\]/)
    assert.match(source, /@contextmenu="handleCanvasContextMenu"/)
    assert.match(source, /@contextmenu\.stop="handleItemContextMenu\(\$event, item\.id\)"/)
    assert.match(source, /target: \{ type: 'canvas' \}/)
    assert.match(source, /target: \{ type: 'item', itemId \}/)
    assert.match(source, /screenToWorld/)
    assert.match(source, /event\.button === 1/)
    assert.match(source, /@auxclick\.prevent/)
    assert.match(source, /event\.preventDefault\(\)/)
    assert.doesNotMatch(source, /<ContextMenu|ContextMenuPanel|ContextMenuItem/)
    assert.doesNotMatch(source, /menu item/i)
  })

  it('normalizes pointer coordinates to the canvas before marquee and world math', () => {
    const source = readBaseCanvas()

    assert.match(source, /ref="canvasRef"/)
    assert.match(source, /function clientPointToCanvasPoint\(point: BaseCanvasPoint\)/)
    assert.match(source, /getBoundingClientRect\(\)/)
    assert.match(source, /const current = clientPointToCanvasPoint\(\{ x: event\.clientX, y: event\.clientY \}\)/)
    assert.match(source, /const rect = rectFromPoints\(marquee\.start, current\)/)
    assert.match(source, /screenToWorld\(clientPointToCanvasPoint/)
  })

  it('exposes a public Vue component entry without importing Vue SFCs from helper tests', () => {
    const componentEntry = readBaseCanvasComponentEntry()
    const helperEntry = readBaseCanvasHelperEntry()

    assert.match(componentEntry, /export \{ default as BaseCanvas \} from '\.\/BaseCanvas\.vue'/)
    assert.doesNotMatch(helperEntry, /BaseCanvas\.vue/)
  })
})

function readBaseCanvas() {
  return readFileSync(fileURLToPath(new URL('../BaseCanvas.vue', import.meta.url)), 'utf8')
}

function readBaseCanvasRulers() {
  return readFileSync(fileURLToPath(new URL('../BaseCanvasRulers.vue', import.meta.url)), 'utf8')
}

function readBaseCanvasComponentEntry() {
  return readFileSync(fileURLToPath(new URL('../components.ts', import.meta.url)), 'utf8')
}

function readBaseCanvasHelperEntry() {
  return readFileSync(fileURLToPath(new URL('../index.ts', import.meta.url)), 'utf8')
}
