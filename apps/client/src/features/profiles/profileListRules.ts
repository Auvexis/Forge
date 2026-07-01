import type { ProfileSummary } from '@/core/api/profiles.api'

export const DEFAULT_PROFILE_ID = 'default'

export function isDefaultProfile(profile: Pick<ProfileSummary, 'id'> | null | undefined) {
  return profile?.id === DEFAULT_PROFILE_ID
}

export function compareProfilesForLoginList(a: ProfileSummary, b: ProfileSummary) {
  if (isDefaultProfile(a)) return -1
  if (isDefaultProfile(b)) return 1
  return a.name.localeCompare(b.name)
}
