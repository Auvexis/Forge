import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveBlockDropIntent } from '../dropIntent.ts'

describe('drop intent', () => {
  it('uses deterministic vertical zones for before, inside, and after', () => {
    assert.deepEqual(
      resolveBlockDropIntent({ x: 50, y: 5, width: 100, height: 100, isContainer: true }),
      { position: 'before', dropEdge: 'top' },
    )
    assert.deepEqual(
      resolveBlockDropIntent({ x: 50, y: 50, width: 100, height: 100, isContainer: true }),
      { position: 'inside', dropEdge: 'center' },
    )
    assert.deepEqual(
      resolveBlockDropIntent({ x: 50, y: 95, width: 100, height: 100, isContainer: true }),
      { position: 'after', dropEdge: 'bottom' },
    )
  })

  it('does not switch non-container blocks to inside in the middle zone', () => {
    assert.deepEqual(
      resolveBlockDropIntent({ x: 50, y: 50, width: 100, height: 100, isContainer: false }),
      { position: 'after', dropEdge: 'center' },
    )
  })

  it('keeps horizontal edge hints separate from insert position', () => {
    assert.deepEqual(
      resolveBlockDropIntent({ x: 4, y: 50, width: 100, height: 100, isContainer: true }),
      { position: 'inside', dropEdge: 'left' },
    )
    assert.deepEqual(
      resolveBlockDropIntent({ x: 96, y: 50, width: 100, height: 100, isContainer: true }),
      { position: 'inside', dropEdge: 'right' },
    )
  })
})
