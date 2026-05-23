import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page preview and publish contract', () => {
  it('router exposes preview and published routes', () => {
    const source = read('src/app/router.ts')
    assert.match(source, /\/pages\/:pageId\/preview/)
    assert.match(source, /\/p\/:slug/)
  })

  it('editor has preview and publish commands', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    assert.match(source, /previewPage/)
    assert.match(source, /publishPage/)
    assert.match(source, /publishActivePage/)
  })

  it('public page route loads published HTML safely', () => {
    const source = read('src/app/pages/PublicSailorPage.vue')
    assert.match(source, /fetch/)
    assert.match(source, /v-html/)
  })

  it('editor block rendering does not use v-html', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')
    assert.doesNotMatch(source, /v-html/)
  })
})
