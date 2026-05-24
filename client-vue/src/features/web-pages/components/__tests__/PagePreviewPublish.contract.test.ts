import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page preview and publish contract', () => {
  it('router does not capture page preview or published site routes', () => {
    const source = read('src/app/router.ts')
    assert.doesNotMatch(source, /\/pages\/:pageId\/preview/)
    assert.doesNotMatch(source, /\/p\/:slug/)
    assert.doesNotMatch(source, /PublicSailorPage/)
  })

  it('editor has preview and publish commands', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    assert.match(source, /previewPage/)
    assert.match(source, /publishPage/)
    assert.match(source, /publishActivePage/)
    assert.match(source, /unpublishPage/)
    assert.match(source, /unpublishActivePage/)
  })

  it('editor opens preview and live site through backend URLs outside Vue router', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /API_BASE_URL/)
    assert.match(source, /ENDPOINTS\.PAGE_PREVIEW/)
    assert.match(source, /ENDPOINTS\.PUBLISHED_PAGE/)
    assert.match(source, /openLivePage/)
    assert.doesNotMatch(source, /window\.open\(`\/p\//)
  })

  it('pages list and editor expose publication status', () => {
    const list = read('src/features/web-pages/components/PagesList.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const toolbar = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(list, /publishedAt/)
    assert.match(list, /web-pages-list__status/)
    assert.match(editor, /publishedAt/)
    assert.match(toolbar, /publishedAt/)
    assert.match(toolbar, /web-page-chrome__publish-status/)
    assert.match(toolbar, /file\.openLive/)
  })

  it('editor block rendering does not use v-html', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')
    assert.doesNotMatch(source, /v-html/)
  })
})
