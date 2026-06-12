import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('block renderer contract', () => {
  it('shows block toolbar only for the selected block without hover state', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.match(source, /isToolbarVisible/)
    assert.match(source, /props\.selectedBlockId === props\.block\.id/)
    assert.doesNotMatch(source, /hoveredBlockId/)
    assert.doesNotMatch(source, /handlePointerMove/)
    assert.doesNotMatch(source, /@pointermove/)
    assert.doesNotMatch(source, /\.web-page-block-frame:hover > \.web-page-block-toolbar/)
  })

  it('keeps the toolbar outside overflow-hidden block clipping', () => {
    const source = read('src/features/web-pages/pages.css')

    assert.match(source, /overflow:\s*visible/)
    assert.match(source, /web-page-block-frame__inner/)
    assert.match(source, /web-page-block-toolbar/)
  })

  it('keeps the rendered block box visually faithful to published output', () => {
    const source = read('src/features/web-pages/pages.css')
    const blockRule = source.match(/^\.web-page-block\s*\{[\s\S]*?\n\}/m)?.[0] ?? ''

    assert.match(blockRule, /position:\s*relative/)
    assert.match(blockRule, /display:\s*block/)
    assert.doesNotMatch(blockRule, /background:/)
    assert.doesNotMatch(blockRule, /padding:/)
    assert.doesNotMatch(blockRule, /border:/)
    assert.doesNotMatch(blockRule, /min-height:\s*36px/)
  })

  it('stabilizes drag intent instead of emitting every dragover tick', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.match(source, /resolveBlockDropIntent/)
    assert.match(source, /lastDragIntentKey/)
    assert.match(source, /emitDragIntent/)
    assert.doesNotMatch(source, /function dropPosition/)
    assert.doesNotMatch(source, /function dropEdge/)
  })
})
