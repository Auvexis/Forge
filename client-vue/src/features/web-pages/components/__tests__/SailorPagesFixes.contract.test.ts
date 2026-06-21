import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('sailor pages fixes contracts', () => {
  it('generated page html mirrors current blocks instead of an empty placeholder', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /renderGeneratedBlockHtml/)
    assert.match(source, /renderGeneratedPageCss/)
    assert.match(source, /renderGeneratedPageJs/)
    assert.doesNotMatch(source, /Generated preview for/)
  })

  it('block selection no longer renders a contextual toolbar', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.doesNotMatch(source, /<Teleport to="body">/)
    assert.doesNotMatch(source, /toolbarPosition/)
    assert.doesNotMatch(source, /web-page-block-toolbar/)
  })

  it('tree supports same-type multi selection and inspector batch patching', () => {
    const tree = read('src/features/web-pages/components/BlockTreePanel.vue')
    const store = read('src/features/web-pages/stores/page-editor.store.ts')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(tree, /selectedBlockIds/)
    assert.match(tree, /event\.shiftKey/)
    assert.match(store, /selectBlockRange/)
    assert.match(store, /patchSelectedBlocks/)
    assert.match(editor, /selectedBlocksSameType/)
  })

  it('custom CSS editor registers CSS completions for pseudo classes', () => {
    const editor = read('src/shared/components/base/BaseCodeEditor.vue')

    assert.match(editor, /registerCompletionItemProvider\('css'/)
    assert.match(editor, /:hover/)
    assert.match(editor, /:focus/)
    assert.match(editor, /cssCompletionProvider/)
  })
})
