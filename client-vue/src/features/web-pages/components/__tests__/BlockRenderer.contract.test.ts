import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('block renderer contract', () => {
  it('does not render a contextual toolbar for selected blocks', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.doesNotMatch(source, /isToolbarVisible/)
    assert.doesNotMatch(source, /web-page-block-toolbar/)
    assert.doesNotMatch(source, /toolbarPosition/)
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
