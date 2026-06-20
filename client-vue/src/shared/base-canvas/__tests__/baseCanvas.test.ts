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
})

function readBaseCanvas() {
  return readFileSync(fileURLToPath(new URL('../BaseCanvas.vue', import.meta.url)), 'utf8')
}
