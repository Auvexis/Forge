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

  it('patches selected block in place to preserve inspector focus', () => {
    const store = usePageEditorStore()
    store.setBlocks(blocks())
    store.selectBlock('section_1')
    const selected = store.selectedBlock

    store.patchBlock('section_1', { props: { label: 'Hero' } })

    assert.equal(store.selectedBlock, selected)
    assert.equal(store.selectedBlock?.props?.label, 'Hero')
  })

  it('renames selected block ids and rejects duplicates', () => {
    const store = usePageEditorStore()
    store.setBlocks([
      {
        id: 'section_1',
        tag: 'section',
        children: [{ id: 'text_1', tag: 'text', children: [] }],
      },
      { id: 'footer_1', tag: 'footer', children: [] },
    ])

    assert.equal(store.renameBlockId('text_1', 'hero_title'), true)
    assert.equal(store.selectedBlockId, 'hero_title')
    assert.equal(store.blocks[0]?.children?.[0]?.id, 'hero_title')

    assert.equal(store.renameBlockId('hero_title', 'footer_1'), false)
    assert.equal(store.blocks[0]?.children?.[0]?.id, 'hero_title')
  })

  it('renames container block ids while preserving children and current selection', () => {
    const store = usePageEditorStore()
    store.setBlocks([
      {
        id: 'div_1',
        tag: 'div',
        children: [
          {
            id: 'header_1',
            tag: 'header',
            children: [{ id: 'text_1', tag: 'text', children: [] }],
          },
        ],
      },
    ])
    store.selectBlock('header_1')

    assert.equal(store.renameBlockId('header_1', 'site_header'), true)
    assert.equal(store.selectedBlockId, 'site_header')
    assert.equal(store.selectedBlock?.id, 'site_header')
    assert.equal(store.selectedBlock?.children?.[0]?.id, 'text_1')

    store.selectBlock('div_1')
    assert.equal(store.renameBlockId('div_1', 'page_shell'), true)
    assert.equal(store.selectedBlockId, 'page_shell')
    assert.equal(store.selectedBlock?.children?.[0]?.id, 'site_header')
  })
})
