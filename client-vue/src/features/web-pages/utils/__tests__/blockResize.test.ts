import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { calculateBlockResize } from '../blockResize.ts'

describe('block resize', () => {
  it('preserves aspect ratio from a corner using signed axes by default', () => {
    const result = calculateBlockResize({
      corner: 'north-west',
      deltaX: 30,
      deltaY: 20,
      width: 200,
      height: 100,
      fontSize: 16,
      tag: 'div',
      freeAspectRatio: false,
    })

    assert.deepEqual(result.styles, { width: '170px', height: '85px' })
    assert.deepEqual(result.anchorOffset, { x: 30, y: 15 })
  })

  it('resizes freely only when free resizing is requested', () => {
    const locked = calculateBlockResize({
      corner: 'south-east', deltaX: 80, deltaY: 10, width: 160, height: 90,
      fontSize: 16, tag: 'div', freeAspectRatio: false,
    })
    const free = calculateBlockResize({
      corner: 'south-east', deltaX: 80, deltaY: 10, width: 160, height: 90,
      fontSize: 16, tag: 'div', freeAspectRatio: true,
    })

    assert.deepEqual(locked.styles, { width: '240px', height: '135px' })
    assert.deepEqual(free.styles, { width: '240px', height: '100px' })
  })

  it('uses horizontal movement for text width and vertical movement for font size', () => {
    const result = calculateBlockResize({
      corner: 'south-east', deltaX: 40, deltaY: 12, width: 220, height: 40,
      fontSize: 18, tag: 'text', freeAspectRatio: false,
    })

    assert.deepEqual(result.styles, { width: '260px', fontSize: '24px' })
    assert.equal(result.label, '260 x 24px text')
  })

  it('clamps dimensions and font size to usable minimums', () => {
    const box = calculateBlockResize({
      corner: 'north-west', deltaX: 500, deltaY: 500, width: 100, height: 80,
      fontSize: 16, tag: 'div', freeAspectRatio: false,
    })
    const text = calculateBlockResize({
      corner: 'north-west', deltaX: 500, deltaY: 500, width: 100, height: 30,
      fontSize: 10, tag: 'text', freeAspectRatio: false,
    })

    assert.deepEqual(box.styles, { width: '40px', height: '32px' })
    assert.deepEqual(text.styles, { width: '40px', fontSize: '8px' })
  })
})
