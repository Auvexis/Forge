import { ENDPOINTS } from './endpoints'
import {
  profilesApi,
  type CreateProfilePayload,
  type ProfileSummary,
  type UpdateProfilePayload,
} from './profiles.api'
import { pluginsApi } from './plugins.api'
import type { ExternalPluginInstallScope } from '../types/plugin.types'

async function contract(profile: ProfileSummary) {
  const createPayload: CreateProfilePayload = {
    name: 'Team Ops',
    avatarEmoji: '🧭',
    email: 'ops@example.com',
  }
  const updatePayload: UpdateProfilePayload = {
    name: 'Team Ops',
    avatarEmoji: '🚢',
    email: null,
  }
  const selectedScope: ExternalPluginInstallScope = 'selected_profile'

  await profilesApi.list()
  await profilesApi.getCurrent()
  await profilesApi.create(createPayload)
  await profilesApi.update(profile.id, updatePayload)
  await profilesApi.setPassword(profile.id, 'secret')
  await profilesApi.removePassword(profile.id)
  await profilesApi.verifyPassword(profile.id, 'secret')
  await profilesApi.switchProfile(profile.id, 'secret')
  await profilesApi.delete(profile.id)
  await pluginsApi.installExternal('preview-1', selectedScope, profile.id)

  return {
    profilePath: ENDPOINTS.PROFILE_BY_ID(profile.id),
    selectedScope,
  }
}

void contract({
  id: 'team-ops',
  name: 'Team Ops',
  avatarEmoji: '🧭',
  email: null,
  passwordProtected: true,
})
