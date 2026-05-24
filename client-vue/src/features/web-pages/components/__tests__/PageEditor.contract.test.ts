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
    assert.match(source, /title="Elements"/)
    assert.match(source, /title="Inspector"/)
    assert.match(source, /<PageFloatingAddToolbar/)
    assert.doesNotMatch(source, /<BlockLibrary/)
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

  it('empty container blocks still render a visible placeholder on the canvas', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')
    const styles = read('src/features/web-pages/pages.css')

    assert.match(source, /web-page-block__placeholder/)
    assert.match(source, /block\.tag/)
    assert.match(styles, /web-page-block__placeholder/)
  })

  it('toolbar emits delete and duplicate', () => {
    const source = read('src/features/web-pages/components/BlockToolbar.vue')

    assert.match(source, /delete/)
    assert.match(source, /duplicate/)
  })

  it('canvas blocks expose ghost duplicate and delete actions', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(renderer, /BaseButton/)
    assert.match(renderer, /variant="ghost"/)
    assert.match(renderer, /duplicate-block/)
    assert.match(renderer, /delete-block/)
    assert.match(canvas, /@duplicate-block/)
    assert.match(editor, /duplicateBlockFromCanvas/)
    assert.match(editor, /deleteBlockFromCanvas/)
  })

  it('tree panel can select block', () => {
    const source = read('src/features/web-pages/components/BlockTreePanel.vue')

    assert.match(source, /select/)
    assert.match(source, /block\.children/)
  })
})
