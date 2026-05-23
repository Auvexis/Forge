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

  it('collapsed panel controls use base buttons and stable edge classes', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const styles = read('src/features/web-pages/pages.css')

    assert.match(source, /BaseButton/)
    assert.match(source, /web-page-editor__panel-toggle/)
    assert.match(styles, /web-page-editor__panel-toggle/)
    assert.match(styles, /web-page-editor--left-collapsed/)
    assert.match(styles, /web-page-editor--right-collapsed/)
  })

  it('editor actions menu uses app dropdown components', () => {
    const menu = read('src/features/web-pages/components/PageEditorActionsMenu.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(menu, /AppDropdownMenu/)
    assert.match(menu, /AppDropdownItem/)
    assert.match(menu, /AppDropdownDivider/)
    assert.match(menu, /switch-page/)
    assert.match(menu, /rename-page/)
    assert.match(menu, /duplicate-page/)
    assert.match(menu, /delete-page/)
    assert.match(editor, /PageEditorActionsMenu/)
  })
})
