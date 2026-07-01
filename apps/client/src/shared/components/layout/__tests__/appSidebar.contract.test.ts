import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../AppSidebar.vue', import.meta.url), 'utf8')

describe('collapsed app sidebar layout', () => {
  it('keeps the profile switcher compact instead of reserving a tall header block', () => {
    assert.match(source, /\.app-sidebar--collapsed \.app-sidebar__header/)
    assert.match(source, /min-height: auto/)
    assert.doesNotMatch(source, /min-height: 122px/)
    assert.match(
      source,
      /\.app-sidebar--collapsed \.app-sidebar__profile-switcher[\s\S]*height: 30px/,
    )
  })
})
