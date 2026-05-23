import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page editor contract', () => {
  it('editor renders selected page and uses panels', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /pagesStore\.activePage/)
    assert.match(source, /<PageCanvas/)
    assert.match(source, /<AppPanel/)
  })

  it('canvas uses structural block renderer, not free-position canvas', () => {
    const source = read('src/features/web-pages/components/PageCanvas.vue')

    assert.match(source, /<BlockRenderer/)
    assert.doesNotMatch(source, /\bx:/)
    assert.doesNotMatch(source, /\by:/)
  })

  it('block renderer recursively renders children and emits selection', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.match(source, /v-for="child in block\.children/)
    assert.match(source, /<BlockRenderer/)
    assert.match(source, /select/)
  })

  it('toolbar emits delete and duplicate', () => {
    const source = read('src/features/web-pages/components/BlockToolbar.vue')

    assert.match(source, /delete/)
    assert.match(source, /duplicate/)
  })

  it('tree panel can select block', () => {
    const source = read('src/features/web-pages/components/BlockTreePanel.vue')

    assert.match(source, /select/)
    assert.match(source, /block\.children/)
  })
})
