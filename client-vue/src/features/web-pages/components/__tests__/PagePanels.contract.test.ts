import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page editor panels contract', () => {
  it('left and right panels can collapse independently', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /isLeftPanelOpen/)
    assert.match(source, /isRightPanelOpen/)
    assert.match(source, /:is-open="isLeftPanelOpen"/)
    assert.match(source, /:is-open="isRightPanelOpen"/)
  })

  it('panel toggles do not clear editor selection', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /toggleLeftPanel/)
    assert.match(source, /toggleRightPanel/)
    assert.doesNotMatch(source, /toggleLeftPanel[\s\S]*clearSelection/)
    assert.doesNotMatch(source, /toggleRightPanel[\s\S]*clearSelection/)
  })

  it('panels close from AppPanel and reopen from the top toolbar', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const styles = read('src/features/web-pages/pages.css')
    const chrome = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(source, /@close="closeLeftPanel"/)
    assert.match(source, /@close="closeRightPanel"/)
    assert.match(chrome, /view\.left-panel/)
    assert.match(chrome, /view\.right-panel/)
    assert.doesNotMatch(source, /web-page-editor__panel-toggle/)
    assert.doesNotMatch(styles, /web-page-editor__panel-toggle/)
    assert.match(styles, /web-page-editor--left-collapsed/)
    assert.match(styles, /web-page-editor--right-collapsed/)
  })

  it('top chrome toolbar uses app dropdown components and replaces bottom actions', () => {
    const menu = read('src/features/web-pages/components/PageChromeToolbar.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(menu, /AppDropdownMenu/)
    assert.match(menu, /AppDropdownItem/)
    assert.match(menu, /File/)
    assert.match(menu, /Edit/)
    assert.match(menu, /View/)
    assert.match(menu, /arrow-right/)
    assert.match(editor, /PageChromeToolbar/)
    assert.doesNotMatch(editor, /web-page-editor__actions/)
  })

  it('toolbar and side panels are fixed to the editor viewport', () => {
    const styles = read('src/features/web-pages/pages.css')

    assert.match(styles, /\.web-page-chrome \{[\s\S]*position: fixed/)
    assert.match(styles, /\.web-page-editor \.app-panel \{[\s\S]*position: fixed/)
  })

  it('page actions are wired to metadata, duplicate and delete flows', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const store = read('src/features/web-pages/stores/pages.store.ts')

    assert.match(editor, /handleChromeCommand/)
    assert.match(editor, /edit\.rename/)
    assert.match(editor, /duplicateActivePage/)
    assert.match(editor, /deleteActivePageAndChooseNext/)
    assert.match(store, /duplicateActivePage/)
    assert.match(store, /deleteActivePageAndChooseNext/)
  })
})
