import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildPluginInstallTargetOptions,
  describePluginInstallTarget,
  installTargetToPayload,
  type PluginInstallTargetProfile,
} from '../pluginInstallTargetOptions.ts'

const profiles: PluginInstallTargetProfile[] = [
  { id: 'default', name: 'Default', avatarEmoji: '⛵' },
  { id: 'team', name: 'Team Ops', avatarEmoji: '🧭' },
]

describe('plugin install target options', () => {
  it('defaults to the current active profile target', () => {
    assert.equal(buildPluginInstallTargetOptions(profiles, 'default')[0]?.value, 'profile:default')
  })

  it('offers selected profiles and all profiles as explicit targets', () => {
    assert.deepEqual(
      buildPluginInstallTargetOptions(profiles, 'default').map((option) => option.label),
      ['⛵ Default (current)', '🧭 Team Ops', 'All profiles'],
    )
  })

  it('converts profile and all-profile selections into install payload scope', () => {
    assert.deepEqual(installTargetToPayload('profile:team'), {
      scope: 'selected_profile',
      profileId: 'team',
    })
    assert.deepEqual(installTargetToPayload('all_profiles'), {
      scope: 'all_profiles',
      profileId: undefined,
    })
  })

  it('describes the install result target clearly', () => {
    assert.equal(describePluginInstallTarget('profile:team', profiles), 'Team Ops')
    assert.equal(describePluginInstallTarget('all_profiles', profiles), 'all profiles')
  })
})
