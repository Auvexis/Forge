import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ADVANCED_CHILD_SIZE,
  ADVANCED_LAYOUT,
  getAdvancedChildPosition,
  getAdvancedParentBounds,
} from '../advancedNodeLayout.ts'

const parent = { x: 500, y: 200, width: 236, height: 100 }

test('bottom handlers place circular children below and center them by handler index', () => {
  assert.deepEqual(getAdvancedChildPosition({
    parent,
    side: 'bottom',
    handlerIndex: 0,
    handlerCount: 3,
    siblingIndex: 0,
  }), {
    x: 500 + 236 / 2 - ADVANCED_CHILD_SIZE / 2 - (ADVANCED_CHILD_SIZE + ADVANCED_LAYOUT.crossGap),
    y: 200 + 100 + ADVANCED_LAYOUT.primaryGap,
  })
})

test('repeated children use deterministic grid rows', () => {
  const first = getAdvancedChildPosition({ parent, side: 'bottom', handlerIndex: 2, handlerCount: 3, siblingIndex: 0 })
  const fifth = getAdvancedChildPosition({ parent, side: 'bottom', handlerIndex: 2, handlerCount: 3, siblingIndex: 4 })

  assert.equal(fifth.x, first.x)
  assert.equal(fifth.y, first.y + ADVANCED_CHILD_SIZE + ADVANCED_LAYOUT.rowGap)
})

test('adjacent handler tracks leave a full child gap without overlap', () => {
  const first = getAdvancedChildPosition({ parent, side: 'bottom', handlerIndex: 0, handlerCount: 3, siblingIndex: 0 })
  const second = getAdvancedChildPosition({ parent, side: 'bottom', handlerIndex: 1, handlerCount: 3, siblingIndex: 0 })

  assert.equal(second.x - first.x, ADVANCED_CHILD_SIZE + ADVANCED_LAYOUT.crossGap)
})

test('top, left, and right handlers mirror the primary layout axis', () => {
  const top = getAdvancedChildPosition({ parent, side: 'top', handlerIndex: 0, handlerCount: 1, siblingIndex: 0 })
  const left = getAdvancedChildPosition({ parent, side: 'left', handlerIndex: 0, handlerCount: 1, siblingIndex: 0 })
  const right = getAdvancedChildPosition({ parent, side: 'right', handlerIndex: 0, handlerCount: 1, siblingIndex: 0 })

  assert.deepEqual(top, { x: 568, y: 15 })
  assert.deepEqual(left, { x: 315, y: 200 })
  assert.deepEqual(right, { x: 821, y: 200 })
})

test('nested dependencies can reuse an arranged child as their parent without overlap', () => {
  const child = getAdvancedChildPosition({
    parent,
    side: 'bottom',
    handlerIndex: 0,
    handlerCount: 1,
    siblingIndex: 0,
  })
  const childBounds = getAdvancedParentBounds(child, { width: ADVANCED_CHILD_SIZE, height: ADVANCED_CHILD_SIZE })
  const grandchild = getAdvancedChildPosition({
    parent: childBounds,
    side: 'bottom',
    handlerIndex: 0,
    handlerCount: 1,
    siblingIndex: 0,
  })

  assert.equal(grandchild.x, child.x)
  assert.equal(grandchild.y, child.y + ADVANCED_CHILD_SIZE + ADVANCED_LAYOUT.primaryGap)
})
