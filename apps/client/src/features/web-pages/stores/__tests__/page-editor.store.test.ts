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

  it('appends root blocks and selects the new block for inspector focus', () => {
    const store = usePageEditorStore()
    store.setBlocks([])

    store.appendBlock({ id: 'text_1', tag: 'text', children: [] })

    assert.equal(store.blocks[0]?.id, 'text_1')
    assert.equal(store.selectedBlockId, 'text_1')
    assert.deepEqual(store.selectedTarget, { type: 'block', blockId: 'text_1' })
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

  it('toggles mixed block selection and patches selected styles together', () => {
    const store = usePageEditorStore()
    store.setBlocks([
      { id: 'section_1', tag: 'section', styles: { color: '#111111' }, children: [] },
      { id: 'input_1', tag: 'input', styles: { fontSize: '14px' }, children: [] },
    ])

    store.selectBlock('section_1')
    store.toggleBlockSelection('input_1')
    store.patchSelectedBlocks({ styles: { fontWeight: '700' } })

    assert.deepEqual(store.selectedBlockIds, ['section_1', 'input_1'])
    assert.equal(store.blocks[0]?.styles?.color, '#111111')
    assert.equal(store.blocks[0]?.styles?.fontWeight, '700')
    assert.equal(store.blocks[1]?.styles?.fontSize, '14px')
    assert.equal(store.blocks[1]?.styles?.fontWeight, '700')
  })

  it('restores multi selection without collapsing to one block', () => {
    const store = usePageEditorStore()

    store.setBlocks([
      { id: 'section_1', tag: 'section', styles: {}, children: [] },
      { id: 'input_1', tag: 'input', styles: {}, children: [] },
    ])

    store.selectBlocks(['section_1', 'input_1'])

    assert.equal(store.selectedBlockId, 'input_1')
    assert.deepEqual(store.selectedBlockIds, ['section_1', 'input_1'])
    assert.equal(store.selectedTarget.type, 'block')
  })

  it('clears block actions when patching action to undefined', () => {
    const store = usePageEditorStore()
    store.setBlocks([
      {
        id: 'button_1',
        tag: 'button',
        children: [],
        action: { id: 'action_1', type: 'openUrl', url: '/home', target: '_blank' },
      },
    ])

    store.patchBlock('button_1', { action: undefined })

    assert.equal(store.blocks[0]?.action, undefined)
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
    assert.deepEqual(store.selectedBlockIds, ['hero_title'])
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

  it('settles drag intent before switching targets to avoid canvas flicker', () => {
    const store = usePageEditorStore()

    store.setDragIntent({ targetId: 'text_1', position: 'after' }, 1000)
    assert.deepEqual(store.dragIntent, { targetId: 'text_1', position: 'after' })

    store.setDragIntent({ targetId: 'button_1', position: 'before' }, 1030)
    assert.deepEqual(store.dragIntent, { targetId: 'text_1', position: 'after' })

    store.setDragIntent({ targetId: 'button_1', position: 'after' }, 1060)
    assert.deepEqual(store.dragIntent, { targetId: 'text_1', position: 'after' })

    store.setDragIntent({ targetId: 'button_1', position: 'after' }, 1155)
    assert.deepEqual(store.dragIntent, { targetId: 'button_1', position: 'after' })
  })
})
