import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildProfileAvatarPickerGroups,
  isEmojiAvatarOption,
  rememberProfileAvatar,
} from '../profileAvatarPickerOptions.ts'

describe('profile avatar picker options', () => {
  it('groups emoji-only avatar choices for compact picking', () => {
    const groups = buildProfileAvatarPickerGroups(['🧭', '⛵'])

    assert.deepEqual(
      groups.map((group) => group.label),
      ['Recent', 'Sea', 'Work', 'Energy'],
    )
    assert.equal(groups.every((group) => group.options.every(isEmojiAvatarOption)), true)
  })

  it('rejects arbitrary images and svg payloads', () => {
    assert.equal(isEmojiAvatarOption('https://example.com/avatar.png'), false)
    assert.equal(isEmojiAvatarOption('<svg></svg>'), false)
  })

  it('keeps recently selected emojis unique and newest first', () => {
    assert.deepEqual(rememberProfileAvatar(['⛵', '🧭'], '⛵'), ['⛵', '🧭'])
    assert.deepEqual(rememberProfileAvatar(['⛵', '🧭'], '🚢'), ['🚢', '⛵', '🧭'])
  })
})
