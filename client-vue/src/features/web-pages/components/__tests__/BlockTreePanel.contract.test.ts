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
    assert.match(source, /web-page-tree__child-count/)
    assert.match(source, /web-page-tree__drag-handle/)
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
})
