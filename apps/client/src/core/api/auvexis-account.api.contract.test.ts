import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('Auvexis account api contract', () => {
  it('defines every Auvexis account endpoint', () => {
    const source = readFileSync('src/core/api/endpoints.ts', 'utf8')

    assert.match(source, /AUVEXIS_ACCOUNT: '\/auvexis\/account'/)
    assert.match(source, /AUVEXIS_ACCOUNT_CONNECT_START: '\/auvexis\/account\/connect\/start'/)
    assert.match(source, /AUVEXIS_ACCOUNT_LOGOUT: '\/auvexis\/account\/logout'/)
    assert.match(source, /AUVEXIS_ACCOUNT_REVOKE: '\/auvexis\/account\/revoke'/)
    assert.match(source, /AUVEXIS_EVENTS: '\/auvexis\/events'/)
  })

  it('exposes safe account methods and no token fields', () => {
    const source = readFileSync('src/core/api/auvexis-account.api.ts', 'utf8')

    for (const method of ['getStatus', 'startConnect', 'logout', 'revoke', 'emitProductEvent']) {
      assert.match(source, new RegExp(`${method}:`))
    }
    assert.doesNotMatch(source, /accessToken|refreshToken|idToken|codeVerifier/)
  })
})
