import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const dialogPath = fileURLToPath(
  new URL('../ProfilePasswordConfirmationDialog.vue', import.meta.url),
)

describe('profile password confirmation dialog contract', () => {
  it('composes AppDialog with a secure password form', () => {
    const source = readFileSync(dialogPath, 'utf8')

    assert.match(source, /<AppDialog/)
    assert.match(source, /layer="top"/)
    assert.match(source, /type="password"/)
    assert.match(source, /autocomplete="current-password"/)
    assert.match(source, /@submit\.prevent="confirm"/)
    assert.match(source, /BaseInput/)
    assert.match(source, /BaseButton/)
  })

  it('emits confirmation only after server-backed password verification', () => {
    const source = readFileSync(dialogPath, 'utf8')

    assert.match(source, /profileStore\.verifyPassword\(props\.profile\.id, submittedPassword\)/)
    assert.match(source, /if \(!result\.valid\)/)
    assert.match(source, /error\.value = 'Invalid password'/)
    assert.match(source, /emit\('confirmed', submittedPassword\)/)
    assert.match(source, /profileStore\.clearError\(\)/)
  })

  it('clears sensitive local state when opened, cancelled, or confirmed', () => {
    const source = readFileSync(dialogPath, 'utf8')

    assert.match(source, /function clearSensitiveState/)
    assert.match(source, /password\.value = ''/)
    assert.match(source, /watch\(/)
    assert.match(source, /emit\('cancel'\)/)
    assert.match(source, /verificationAttempt/)
    assert.match(source, /attempt !== verificationAttempt/)
    assert.match(source, /finally[\s\S]*isVerifying\.value = false/)
  })
})
