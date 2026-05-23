import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page drag prediction contract', () => {
  it('editor store exposes current drag placement intent', () => {
    const source = read('src/features/web-pages/stores/page-editor.store.ts')

    assert.match(source, /PageDragIntent/)
    assert.match(source, /dragIntent/)
    assert.match(source, /setDragIntent/)
    assert.match(source, /clearDragIntent/)
  })

  it('block renderer reports predicted placement while dragging', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.match(source, /drag-intent/)
    assert.match(source, /targetId: props\.block\.id/)
    assert.match(source, /dropPosition\(event\)/)
  })

  it('canvas clears prediction on drag leave and drop', () => {
    const source = read('src/features/web-pages/components/PageCanvas.vue')

    assert.match(source, /drag-intent/)
    assert.match(source, /clear-drag-intent/)
    assert.match(source, /@dragleave/)
  })

  it('css includes placement indicator states', () => {
    const source = read('src/features/web-pages/pages.css')

    assert.match(source, /web-page-drop-indicator/)
    assert.match(source, /web-page-block--drop-before/)
    assert.match(source, /web-page-block--drop-after/)
    assert.match(source, /web-page-block--drop-inside/)
  })
})
