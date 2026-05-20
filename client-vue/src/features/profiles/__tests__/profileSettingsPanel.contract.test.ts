import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(
  new URL('../components/ProfileSettingsPanel.vue', import.meta.url),
  'utf8',
)

describe('profile settings panel shell', () => {
  it('uses BaseModal for the edit profile modal shell', () => {
    assert.match(source, /<BaseModal\b/)
    assert.match(source, /import BaseModal from '@\/shared\/components\/base\/BaseModal\.vue'/)
    assert.doesNotMatch(source, /<AppDialog\b/)
    assert.doesNotMatch(source, /import AppDialog/)
  })

  it('keeps password controls in the main profile form after email without a separate action button', () => {
    assert.match(source, /class="profile-settings__password-field"/)
    assert.match(source, /label="Email"[\s\S]*class="profile-settings__password-field"/)
    assert.match(source, /label="Current password"/)
    assert.match(source, /label="New password"/)
    assert.match(source, /profileStore\.verifyPassword/)
    assert.doesNotMatch(source, />\s*Set password\s*</)
    assert.doesNotMatch(source, />\s*Remove password\s*</)
    assert.doesNotMatch(source, /<section class="profile-settings__password"/)
    assert.doesNotMatch(source, /class="profile-settings__password-form"/)
  })
})
