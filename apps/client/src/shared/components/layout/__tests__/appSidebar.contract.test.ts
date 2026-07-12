import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../AppSidebar.vue', import.meta.url), 'utf8')

describe('app sidebar layout', () => {
  it('renders only the feature navigation area inside the shell row', () => {
    assert.match(source, /<nav class="app-sidebar__main">/)
    assert.match(source, /height: 100%/)
    assert.match(source, /min-height: 0/)
    assert.doesNotMatch(source, /app-sidebar__header/)
    assert.doesNotMatch(source, /app-sidebar__footer/)
  })
})
