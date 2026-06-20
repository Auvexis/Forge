import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  screenToWorld,
  shouldBypassSnap,
  snapPointToGrid,
  worldToScreen,
} from '../index.ts'

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
