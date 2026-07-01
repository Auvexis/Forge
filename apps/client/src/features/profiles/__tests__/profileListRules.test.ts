import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { compareProfilesForLoginList, isDefaultProfile } from '../profileListRules.ts'

describe('profile list rules', () => {
  it('keeps the default profile first before alphabetical sorting', () => {
    const profiles = [
      { id: 'z-team', name: 'Z Team', avatarEmoji: '🧭', email: null, passwordProtected: false },
      { id: 'alpha', name: 'Alpha', avatarEmoji: '🚢', email: null, passwordProtected: false },
      { id: 'default', name: 'Default', avatarEmoji: '⛵', email: null, passwordProtected: false },
    ]

    assert.deepEqual(
      profiles.sort(compareProfilesForLoginList).map((profile) => profile.id),
      ['default', 'alpha', 'z-team'],
    )
  })

  it('identifies the default profile by id', () => {
    assert.equal(isDefaultProfile({ id: 'default' }), true)
    assert.equal(isDefaultProfile({ id: 'Default' }), false)
  })
})
