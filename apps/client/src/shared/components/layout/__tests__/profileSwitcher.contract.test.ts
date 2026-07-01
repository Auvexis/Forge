import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildProfileSwitcherActions,
  profileSwitcherTriggerLabel,
  profileSwitcherUsesActiveAvatar,
  type ProfileSwitcherSummary,
} from '../profileSwitcherOptions.ts'

const activeProfile: ProfileSwitcherSummary = {
  id: 'captain',
  name: 'Captain',
  avatarEmoji: '⛵',
  email: 'captain@sailor.dev',
  passwordProtected: true,
}

describe('profile switcher options', () => {
  it('uses the active profile avatar and name as the sidebar trigger identity', () => {
    assert.equal(profileSwitcherUsesActiveAvatar, true)
    assert.equal(profileSwitcherTriggerLabel(activeProfile), '⛵ Captain')
  })

  it('exposes compact sidebar actions for profile management', () => {
    assert.deepEqual(
      buildProfileSwitcherActions(activeProfile).map((action) => action.id),
      [
        'switch-profile',
        'sign-out',
        'profile-settings',
        'rename-profile',
        'change-avatar',
        'change-email',
        'remove-password',
      ],
    )
  })

  it('shows set password when the current profile is unprotected', () => {
    assert.equal(
      buildProfileSwitcherActions({ ...activeProfile, passwordProtected: false }).at(-1)?.id,
      'set-password',
    )
  })
})
