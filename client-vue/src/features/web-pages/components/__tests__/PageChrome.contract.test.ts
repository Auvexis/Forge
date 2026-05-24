import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page chrome contract', () => {
  it('pages editor enters immersive app chrome mode only while editing a page', () => {
    const source = read('src/app/pages/PagesEditorPage.vue')

    assert.match(source, /useAppUiStore/)
    assert.match(source, /enterUniverseMode/)
    assert.match(source, /quitUniverseMode/)
    assert.match(source, /route\.params\.pageId/)
  })

  it('page chrome exposes top File Edit View menus and exit command', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(source, /go\.pages/)
    assert.match(source, /File/)
    assert.match(source, /Edit/)
    assert.match(source, /View/)
    assert.match(source, /file\.save/)
    assert.match(source, /file\.preview/)
    assert.match(source, /file\.publish/)
  })

  it('page chrome has direct save preview and publish ghost buttons', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(source, /BaseButton/)
    assert.match(source, /variant="ghost"/)
    assert.match(source, /Save/)
    assert.match(source, /Preview/)
    assert.match(source, /Publish/)
  })

  it('page badge exposes a direct delete button', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /web-page-editor__page-chip/)
    assert.match(source, /deletePageFromBadge/)
    assert.match(source, /icon-left="trash-2"/)
    assert.match(source, /variant="ghost"/)
  })
})
