import type { ExternalPluginInstallScope } from '@/core/types/plugin.types'
import type { SelectOption } from '@/shared/components/base/BaseSelect.vue'

export interface PluginInstallTargetProfile {
  id: string
  name: string
  avatarEmoji: string
}

export interface PluginInstallTargetPayload {
  scope: ExternalPluginInstallScope
  profileId?: string
}

export function profileInstallTargetValue(profileId: string): string {
  return `profile:${profileId}`
}

export function buildPluginInstallTargetOptions(
  profiles: PluginInstallTargetProfile[],
  currentProfileId: string | null | undefined,
): SelectOption[] {
  return [
    ...profiles.map((profile) => ({
      value: profileInstallTargetValue(profile.id),
      label: `${profile.avatarEmoji} ${profile.name}${profile.id === currentProfileId ? ' (current)' : ''}`,
      icon: profile.id === currentProfileId ? 'user-check' : 'user',
    })),
    {
      value: 'all_profiles',
      label: 'All profiles',
      icon: 'users',
    },
  ]
}

export function installTargetToPayload(target: string): PluginInstallTargetPayload {
  if (target === 'all_profiles') {
    return { scope: 'all_profiles', profileId: undefined }
  }

  if (target.startsWith('profile:')) {
    const profileId = target.slice('profile:'.length)
    return { scope: 'selected_profile', profileId }
  }

  return { scope: 'current_profile', profileId: undefined }
}

export function describePluginInstallTarget(
  target: string,
  profiles: PluginInstallTargetProfile[],
): string {
  if (target === 'all_profiles') return 'all profiles'

  const payload = installTargetToPayload(target)
  if (payload.profileId) {
    return profiles.find((profile) => profile.id === payload.profileId)?.name ?? payload.profileId
  }

  return 'current profile'
}
