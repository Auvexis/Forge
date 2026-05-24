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
})
