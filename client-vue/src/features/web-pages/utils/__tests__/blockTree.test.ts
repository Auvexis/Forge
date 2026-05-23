import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  deleteBlock,
  duplicateBlock,
  findBlock,
  insertBlock,
  moveBlock,
} from '../blockTree.ts'
import { createBlock } from '../createBlock.ts'
import type { PageBlock } from '../../types/page.types.ts'

function tree(): PageBlock[] {
  return [
    {
      id: 'section_1',
      tag: 'section',
      children: [
        { id: 'text_1', tag: 'text', props: { text: 'Hello' }, children: [] },
      ],
    },
    { id: 'footer_1', tag: 'footer', children: [] },
  ]
}

describe('block tree utilities', () => {
  it('inserts block before target', () => {
    const result = insertBlock(tree(), 'footer_1', 'before', createBlock('text', 'text_2'))

    assert.deepEqual(result.map((block) => block.id), ['section_1', 'text_2', 'footer_1'])
  })

  it('inserts block after target', () => {
    const result = insertBlock(tree(), 'section_1', 'after', createBlock('text', 'text_2'))

    assert.deepEqual(result.map((block) => block.id), ['section_1', 'text_2', 'footer_1'])
  })

  it('inserts block inside container', () => {
    const result = insertBlock(tree(), 'section_1', 'inside', createBlock('button', 'button_1'))

    assert.deepEqual(result[0]?.children?.map((block) => block.id), ['text_1', 'button_1'])
  })

  it('rejects inserting inside non-container block', () => {
    const result = insertBlock(tree(), 'text_1', 'inside', createBlock('button', 'button_1'))

    assert.deepEqual(result, tree())
  })

  it('moves block without losing children', () => {
    const result = moveBlock(tree(), 'section_1', 'footer_1', 'after')

    assert.equal(result[1]?.id, 'section_1')
    assert.equal(result[1]?.children?.[0]?.id, 'text_1')
  })

  it('prevents moving a block inside itself or descendant', () => {
    const result = moveBlock(tree(), 'section_1', 'text_1', 'inside')

    assert.deepEqual(result, tree())
  })

  it('deletes block', () => {
    const result = deleteBlock(tree(), 'text_1')

    assert.deepEqual(result[0]?.children, [])
  })

  it('duplicates block with new ids', () => {
    const result = duplicateBlock(tree(), 'section_1')

    assert.equal(result.length, 3)
    assert.match(result[1]?.id ?? '', /^section_/)
    assert.notEqual(result[1]?.id, 'section_1')
    assert.notEqual(result[1]?.children?.[0]?.id, 'text_1')
  })

  it('finds selected block path', () => {
    const found = findBlock(tree(), 'text_1')

    assert.equal(found?.block.id, 'text_1')
    assert.deepEqual(found?.path, [0, 0])
  })
})
