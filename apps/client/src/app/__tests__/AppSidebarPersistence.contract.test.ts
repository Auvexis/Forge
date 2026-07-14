import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const source = readFileSync(resolve('src/app/App.vue'), 'utf8')

describe('app sidebar persistence', () => {
  it('persists the collapsed state in localStorage', () => {
    assert.match(source, /fabric:app-sidebar-collapsed/)
    assert.match(source, /readStoredSidebarCollapsed/)
    assert.match(source, /persistSidebarCollapsed/)
    assert.match(source, /watch\(isSidebarCollapsed, persistSidebarCollapsed\)/)
  })
})
