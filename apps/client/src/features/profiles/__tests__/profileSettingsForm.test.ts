import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildProfileSettingsPayload, profilePasswordStateLabel } from '../profileSettingsForm.ts'

describe('profile settings form', () => {
  it('builds a trimmed profile update payload', () => {
    assert.deepEqual(
      buildProfileSettingsPayload({
        name: '  Ops  ',
        avatarEmoji: '🧭',
        email: ' ops@example.com ',
      }),
      {
        name: 'Ops',
        avatarEmoji: '🧭',
        email: 'ops@example.com',
      },
    )
  })

  it('keeps optional email nullable', () => {
    assert.equal(buildProfileSettingsPayload({ name: 'Ops', avatarEmoji: '⛵', email: ' ' }).email, null)
  })

  it('shows password protection state without exposing password data', () => {
    assert.equal(profilePasswordStateLabel(true), 'Password enabled')
    assert.equal(profilePasswordStateLabel(false), 'Password disabled')
  })
})
