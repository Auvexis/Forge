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
    assert.match(source, /file\.unpublish/)
    assert.match(source, /file\.openLive/)
    assert.match(source, /file\.exportProject/)
    assert.match(source, /Export project/)
  })

  it('page chrome switches File Edit View dropdowns on hover after a menu is open', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(source, /menuRefs/)
    assert.match(source, /activeMenuId/)
    assert.match(source, /registerMenuRef/)
    assert.match(source, /openChromeMenu/)
    assert.match(source, /handleMenuMouseEnter/)
    assert.match(source, /@mouseenter="handleMenuMouseEnter\(menu\.id\)"/)
    assert.match(source, /@open="activeMenuId = menu\.id"/)
  })

  it('page chrome has direct save preview and publish ghost buttons', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(source, /BaseButton/)
    assert.match(source, /variant="ghost"/)
    assert.match(source, /Save/)
    assert.match(source, /Preview/)
    assert.match(source, /Publish/)
    assert.match(source, /Unpublish/)
    assert.match(source, /Open live/)
  })

  it('page chrome mirrors workflow save cloud status and save dot states', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(source, /saveState/)
    assert.match(source, /saveStatusIcon/)
    assert.match(source, /cloud-check/)
    assert.match(source, /cloud-alert/)
    assert.match(source, /loader-circle/)
    assert.match(source, /web-page-chrome__save-status/)
    assert.match(source, /web-page-chrome__save-dot/)
    assert.match(source, /web-page-chrome__save-dot--dirty/)
    assert.match(css, /300ms/)
  })

  it('page badge exposes a direct delete button', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /web-page-editor__page-chip/)
    assert.match(source, /deletePageFromBadge/)
    assert.match(source, /icon-left="trash-2"/)
    assert.match(source, /variant="ghost"/)
  })

  it('page editor passes dirty and saving state to chrome and makes both side panels resizable', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /:is-dirty="editorStore\.isDirty \|\| pagesStore\.isDirty \|\| sitesStore\.isDirty"/)
    assert.match(source, /:is-saving="pagesStore\.isSaving \|\| sitesStore\.isSaving"/)
    assert.match(source, /resizable/)
    assert.match(source, /resize-side="right"/)
    assert.match(source, /resize-side="left"/)
  })

  it('page editor downloads active site project from the File menu export command', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /file\.exportProject/)
    assert.match(source, /exportActiveProject/)
    assert.match(source, /sitesStore\.exportActiveSiteProject\(\)/)
    assert.match(source, /downloadBlobFile/)
    assert.match(source, /\.sailor-site\.zip/)
    assert.doesNotMatch(source, /downloadJsonFile/)
    assert.match(source, /Blob/)
    assert.doesNotMatch(source, /\.sailor\.json/)
  })
})
