import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page selection contract', () => {
  it('selected blocks expose four corner resize handles and a live size indicator', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')

    for (const corner of ['north-west', 'north-east', 'south-west', 'south-east']) {
      assert.match(renderer, new RegExp(corner))
    }
    assert.match(renderer, /web-page-block-resize__indicator/)
    assert.match(renderer, /resize-block/)
    assert.match(editor, /patchBlock/)
    assert.match(css, /web-page-block-resize__handle/)
    assert.match(css, /outline:\s*1px solid var\(--web-page-selected-color\)/)
    assert.doesNotMatch(css, /@keyframes web-page-selected-dash/)
  })
  it('canvas can select the body independently from blocks', () => {
    const source = read('src/features/web-pages/components/PageCanvas.vue')

    assert.match(source, /select-body/)
    assert.match(source, /@click\.self/)
  })

  it('editor store tracks page, body, block and empty selection targets', () => {
    const source = read('src/features/web-pages/stores/page-editor.store.ts')

    assert.match(source, /PageEditorSelection/)
    assert.match(source, /type: 'page'/)
    assert.match(source, /type: 'body'/)
    assert.match(source, /type: 'block'/)
    assert.match(source, /type: 'none'/)
    assert.match(source, /selectPage/)
    assert.match(source, /selectBody/)
  })

  it('page editor renders the correct inspector for the selected target', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /PageMetadataPanel/)
    assert.match(source, /editorStore\.selectedTarget\.type === 'page'/)
    assert.match(source, /editorStore\.selectedTarget\.type === 'body'/)
    assert.match(source, /editorStore\.selectedTarget\.type === 'block'/)
    assert.match(source, /@select-body/)
  })

  it('page metadata panel edits page-level fields without saving directly', () => {
    const source = read('src/features/web-pages/components/PageMetadataPanel.vue')

    assert.match(source, /BaseInput/)
    assert.match(source, /title/)
    assert.match(source, /slug/)
    assert.match(source, /patch/)
    assert.doesNotMatch(source, /pagesApi|saveActivePage|fetch\(/)
  })

  it('page metadata panel uses base inputs and emits page patches', () => {
    const source = read('src/features/web-pages/components/PageMetadataPanel.vue')

    assert.match(source, /BaseInput/)
    assert.match(source, /patchField\('title'/)
    assert.match(source, /patchField\('slug'/)
  })
})
