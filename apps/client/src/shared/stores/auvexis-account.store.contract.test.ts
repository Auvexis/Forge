import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('Auvexis account store contract', () => {
  it('owns safe Auvexis account status and actions', () => {
    const source = readFileSync('src/shared/stores/auvexis-account.store.ts', 'utf8')

    assert.match(source, /defineStore\('auvexis-account'/)
    for (const state of ['status', 'account', 'lastValidatedAt', 'isLoading', 'isConnecting', 'error']) {
      assert.match(source, new RegExp(`const ${state}`))
    }
    for (const action of ['loadStatus', 'connect', 'logout', 'clearProfileScopedState']) {
      assert.match(source, new RegExp(`function ${action}|async function ${action}`))
    }
    assert.doesNotMatch(source, /async function revoke/)
    assert.match(source, /auvexisAccountApi\.revoke\(\)/)
  })

  it('opens the authorization URL and never stores tokens', () => {
    const source = readFileSync('src/shared/stores/auvexis-account.store.ts', 'utf8')

    assert.match(source, /window\.open\(result\.authorizationUrl, '_blank', 'noopener,noreferrer'\)/)
    assert.doesNotMatch(source, /accessToken|refreshToken|idToken|codeVerifier/)
  })
})
