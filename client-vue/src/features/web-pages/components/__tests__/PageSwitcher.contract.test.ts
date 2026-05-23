import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page switcher contract', () => {
  it('switcher modal uses BaseModal and renders page preview cards', () => {
    const source = read('src/features/web-pages/components/PageSwitcherModal.vue')

    assert.match(source, /BaseModal/)
    assert.match(source, /page in pages/)
    assert.match(source, /web-page-switcher__preview/)
    assert.match(source, /web-page-switcher__title/)
    assert.match(source, /select/)
  })

  it('editor opens page switcher from dropdown action', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /PageSwitcherModal/)
    assert.match(source, /isPageSwitcherOpen/)
    assert.match(source, /openPageSwitcher/)
    assert.match(source, /switchPage/)
  })

  it('pages store exposes a guarded page switch helper', () => {
    const source = read('src/features/web-pages/stores/pages.store.ts')

    assert.match(source, /switchPage/)
    assert.match(source, /Save current page before switching/)
  })
})
