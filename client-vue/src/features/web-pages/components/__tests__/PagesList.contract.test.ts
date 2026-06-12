import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

describe('pages management UI contract', () => {
  it('router exposes /pages and /pages/:pageId', () => {
    const source = fs.readFileSync(path.resolve('src/app/router.ts'), 'utf8')

    assert.match(source, /path: '\/pages'/)
    assert.match(source, /path: '\/pages\/:pageId'/)
  })

  it('page shell mounts PagesList', () => {
    const source = fs.readFileSync(path.resolve('src/app/pages/PagesEditorPage.vue'), 'utf8')

    assert.match(source, /<PagesList/)
    assert.match(source, /AppPage/)
  })

  it('create, delete and open actions are wired to store', () => {
    const source = fs.readFileSync(
      path.resolve('src/features/web-pages/components/PagesList.vue'),
      'utf8',
    )

    assert.match(source, /createPage/)
    assert.match(source, /deletePage/)
    assert.match(source, /openPage/)
    assert.match(source, /router\.push/)
  })

  it('renders pages as searchable grid cards and creates pages through BaseModal', () => {
    const list = fs.readFileSync(path.resolve('src/features/web-pages/components/PagesList.vue'), 'utf8')
    const modal = fs.readFileSync(path.resolve('src/features/web-pages/components/PageCreateSiteModal.vue'), 'utf8')

    assert.match(list, /searchQuery/)
    assert.match(list, /filteredPages/)
    assert.match(list, /web-pages-list__grid/)
    assert.match(list, /PageCreateSiteModal/)
    assert.match(list, /variant="primary"/)
    assert.match(modal, /BaseModal/)
    assert.match(modal, /BaseInput/)
    assert.match(modal, /create/)
  })
})
