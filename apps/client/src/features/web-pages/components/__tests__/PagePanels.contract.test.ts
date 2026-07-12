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
    assert.match(source, /web-page-editor--left-collapsed/)
    assert.match(source, /web-page-editor--right-collapsed/)
  })

  it('top chrome toolbar uses app dropdown components and replaces bottom actions', () => {
    const menu = read('src/features/web-pages/components/PageChromeToolbar.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(menu, /AppDropdownMenu/)
    assert.match(menu, /AppDropdownItem/)
    assert.match(menu, /File/)
    assert.match(menu, /Edit/)
    assert.match(menu, /View/)
    assert.match(menu, /Teleport to="#fabric-topbar-left"/)
    assert.match(editor, /PageChromeToolbar/)
    assert.doesNotMatch(editor, /web-page-editor__actions/)
  })

  it('toolbar participates in the editor layout while side panels stay fixed below it', () => {
    const styles = read('src/features/web-pages/pages.css')
    const editorRule = styles.match(/\.web-page-editor\s*{[\s\S]*?}/)?.[0] ?? ''
    const chromeRule = styles.match(/\.web-page-chrome\s*{[\s\S]*?}/)?.[0] ?? ''
    const panelRule = styles.match(/\.web-page-editor \.app-panel\s*{[\s\S]*?}/)?.[0] ?? ''

    assert.match(editorRule, /display:\s*grid/)
    assert.match(editorRule, /grid-template-rows:\s*40px minmax\(0,\s*1fr\)/)
    assert.doesNotMatch(chromeRule, /position:\s*fixed/)
    assert.match(chromeRule, /position:\s*relative/)
    assert.match(panelRule, /position:\s*fixed/)
    assert.match(panelRule, /top:\s*40px/)
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

  it('editor does not reset inspector selection while saving or patching the same page', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /editorPageId/)
    assert.match(source, /if \(page\?\.id === editorPageId\.value\) return/)
    assert.match(source, /restoreSelection/)
  })
})
