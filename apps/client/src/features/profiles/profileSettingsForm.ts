import type { UpdateProfilePayload } from '@/core/api/profiles.api'

export interface ProfileSettingsDraft {
  name: string
  avatarEmoji: string
  email: string
}

export function buildProfileSettingsPayload(draft: ProfileSettingsDraft): UpdateProfilePayload {
  return {
    name: draft.name.trim(),
    avatarEmoji: draft.avatarEmoji,
    email: draft.email.trim() || null,
  }
}

export function profilePasswordStateLabel(passwordProtected: boolean): string {
  return passwordProtected ? 'Password enabled' : 'Password disabled'
}
