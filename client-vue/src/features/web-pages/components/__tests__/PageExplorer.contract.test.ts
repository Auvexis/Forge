import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page explorer contract', () => {
  it('left panel is renamed Explorer and renders Tree and Code tabs', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const explorer = read('src/features/web-pages/components/PageExplorerPanel.vue')

    assert.match(editor, /title="Explorer"/)
    assert.match(editor, /<PageExplorerPanel/)
    assert.match(explorer, /Tree/)
    assert.match(explorer, /Code/)
    assert.match(explorer, /BlockTreePanel/)
    assert.match(explorer, /SiteFilesPanel/)
  })

  it('code tab opens site files on the canvas with BaseCodeEditor', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const files = read('src/features/web-pages/components/SiteFilesPanel.vue')
    const codeCanvas = read('src/features/web-pages/components/SiteCodeCanvas.vue')

    assert.match(files, /css\/site\.css/)
    assert.match(files, /js\/site\.js/)
    assert.match(files, /pages\//)
    assert.match(files, /assets\//)
    assert.match(files, /open-file/)
    assert.match(editor, /activeCodeFile/)
    assert.match(editor, /<SiteCodeCanvas/)
    assert.match(codeCanvas, /BaseCodeEditor/)
    assert.match(codeCanvas, /readonly/)
    assert.match(codeCanvas, /image preview/i)
  })
})
