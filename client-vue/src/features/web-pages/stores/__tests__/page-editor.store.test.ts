import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { usePageEditorStore } from '../page-editor.store.ts'
import type { PageBlock } from '../../types/page.types.ts'

function blocks(): PageBlock[] {
  return [{ id: 'section_1', tag: 'section', children: [] }]
}

describe('page editor store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('sets active page blocks and selected block', () => {
    const store = usePageEditorStore()

    store.setBlocks(blocks())
    store.selectBlock('section_1')

    assert.equal(store.selectedBlock?.id, 'section_1')
    assert.equal(store.isDirty, false)
  })

  it('insert, move and delete delegates to tree utilities and marks dirty', () => {
    const store = usePageEditorStore()
    store.setBlocks(blocks())

    store.insertBlock('section_1', 'inside', { id: 'text_1', tag: 'text', children: [] })
    assert.equal(store.blocks[0]?.children?.[0]?.id, 'text_1')
    assert.equal(store.isDirty, true)

    store.moveBlock('text_1', 'section_1', 'after')
    assert.equal(store.blocks[1]?.id, 'text_1')

    store.deleteBlock('text_1')
    assert.equal(store.blocks.length, 1)
  })

  it('undo and redo restores block tree', () => {
    const store = usePageEditorStore()
    store.setBlocks(blocks())

    store.insertBlock('section_1', 'after', { id: 'text_1', tag: 'text', children: [] })
    assert.equal(store.blocks.length, 2)

    store.undo()
    assert.equal(store.blocks.length, 1)

    store.redo()
    assert.equal(store.blocks.length, 2)
  })
})
