import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('Auvexis account settings UI contract', () => {
  it('adds an Auvexis tab to global settings', () => {
    const source = readFileSync('src/shared/components/layout/AppGlobalSettings.vue', 'utf8')

    assert.match(source, /id: 'auvexis', label: 'Auvexis'/)
    assert.match(source, /activeTab === 'auvexis'/)
    assert.match(source, /<AuvexisAccountSettings/)
    assert.match(source, /import AuvexisAccountSettings/)
  })

  it('uses reusable shared components in the Auvexis settings section', () => {
    const source = readFileSync('src/shared/components/layout/AuvexisAccountSettings.vue', 'utf8')

    assert.match(source, /BaseButton/)
    assert.match(source, /BaseBadge/)
    assert.match(source, /useAuvexisAccountStore/)
    assert.match(source, /@click="accountStore\.connect"/)
    assert.match(source, /@click="accountStore\.logout"/)
    assert.doesNotMatch(source, /@click="accountStore\.revoke"/)
    assert.doesNotMatch(source, /Logout local/)
    assert.doesNotMatch(source, />\s*Revoke\s*</)
  })
})
