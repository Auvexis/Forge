import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page switcher contract', () => {
  it('switcher modal uses BaseModal and renders page preview cards', () => {
    const source = read('src/features/web-pages/components/PageSwitcherModal.vue')

    assert.match(source, /BaseModal/)
    assert.match(source, /page in pages/)
    assert.match(source, /web-page-switcher__preview/)
    assert.match(source, /web-page-switcher__title/)
    assert.match(source, /select/)
  })

  it('editor opens page switcher from dropdown action', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /PageSwitcherModal/)
    assert.match(source, /isPageSwitcherOpen/)
    assert.match(source, /openPageSwitcher/)
    assert.match(source, /switchPage/)
  })

  it('pages store exposes a guarded page switch helper', () => {
    const source = read('src/features/web-pages/stores/pages.store.ts')

    assert.match(source, /switchPage/)
    assert.match(source, /Save current page before switching/)
  })

  it('editor renders open pages in the canvas and can create a new page below without inserting a block', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const store = read('src/features/web-pages/stores/pages.store.ts')

    assert.match(editor, /web-page-editor__add-page/)
    assert.match(editor, /web-page-editor__workspace/)
    assert.match(editor, /web-page-editor__page-handle/)
    assert.match(editor, /pageBlocks/)
    assert.match(editor, /pageBodyStyles/)
    assert.match(store, /pageDocuments/)
    assert.match(store, /loadPageDocuments/)
    assert.match(editor, /addPageBelowCanvas/)
    assert.match(store, /createPageAfterActive/)
    assert.match(store, /activeIndex \+ 1/)
    const addPageFunction = editor.match(/async function addPageBelowCanvas\(\) \{[\s\S]*?\n\}/)?.[0] ?? ''
    assert.doesNotMatch(addPageFunction, /insertBlock/)
  })
})
