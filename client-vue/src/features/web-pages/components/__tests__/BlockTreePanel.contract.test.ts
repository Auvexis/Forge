import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('block tree panel contract', () => {
  it('tree rows expose richer element information', () => {
    const source = read('src/features/web-pages/components/BlockTreePanel.vue')

    assert.match(source, /LucideIcon/)
    assert.match(source, /blockDisplayName/)
    assert.match(source, /blockChildCount/)
    assert.match(source, /web-page-tree__status/)
    assert.match(source, /web-page-tree__section/)
  })

  it('container rows can expand and collapse', () => {
    const source = read('src/features/web-pages/components/BlockTreePanel.vue')
    const store = read('src/features/web-pages/stores/page-editor.store.ts')

    assert.match(source, /toggleBlockCollapsed/)
    assert.match(source, /isBlockCollapsed/)
    assert.match(source, /web-page-tree__collapse/)
    assert.match(store, /collapsedBlockIds/)
  })

  it('block tree utilities expose display helpers', () => {
    const source = read('src/features/web-pages/utils/blockTree.ts')

    assert.match(source, /blockDisplayName/)
    assert.match(source, /blockChildCount/)
  })

  it('tree has depth guides, row action affordance and selected styling', () => {
    const source = read('src/features/web-pages/pages.css')

    assert.match(source, /web-page-tree__depth-guide/)
    assert.match(source, /web-page-tree__row-action/)
    assert.match(source, /web-page-tree__item--selected/)
  })

  it('tree can list pages above the active page elements', () => {
    const source = read('src/features/web-pages/components/BlockTreePanel.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /pages/)
    assert.match(source, /activePageId/)
    assert.match(source, /select-page/)
    assert.match(source, /web-page-tree__item--page/)
    assert.match(editor, /:pages="pagesStore\.pages"/)
    assert.match(editor, /@select-page="selectTreePage"/)
  })

  it('tree can add pages and collapse expanded pages', () => {
    const source = read('src/features/web-pages/components/BlockTreePanel.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /@click="\$emit\('add-page'\)"/)
    assert.match(source, /togglePage/)
    assert.match(source, /isPageExpanded/)
    assert.match(source, /blocks\.length > 0/)
    assert.match(editor, /@add-page="addPageBelowCanvas"/)
  })

  it('tree exposes page and block actions through dropdown menus', () => {
    const source = read('src/features/web-pages/components/BlockTreePanel.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /AppDropdownMenu/)
    assert.match(source, /duplicate-page/)
    assert.match(source, /delete-page/)
    assert.match(source, /duplicate-block/)
    assert.match(source, /delete-block/)
    assert.match(source, /web-page-tree__action-menu/)
    assert.doesNotMatch(source, /web-page-tree__row-action" @click\.stop/)
    assert.match(editor, /deletePageFromTree/)
    assert.match(editor, /deleteBlockFromTree/)
  })

  it('tree rows support dropping blocks before, inside and after another block', () => {
    const source = read('src/features/web-pages/components/BlockTreePanel.vue')

    assert.match(source, /@dragover\.prevent/)
    assert.match(source, /@drop\.prevent/)
    assert.match(source, /dropPosition/)
    assert.match(source, /move-block/)
    assert.match(source, /position: dropPosition\(event, block\)/)
  })
})
