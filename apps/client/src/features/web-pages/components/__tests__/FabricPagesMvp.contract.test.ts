import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('fabric pages mvp contract', () => {
  it('exposes pages nav, create, form import and publish', () => {
    const nav = read('src/shared/components/layout/appSidebarNavigation.ts')
    const list = read('src/features/web-pages/components/PagesList.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(nav, /id: 'pages'/)
    assert.match(list, /createPage/)
    assert.match(editor, /FormImportPanel/)
    assert.match(editor, /publishPage/)
  })
})
