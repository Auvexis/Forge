import { PROFILE_AVATAR_GROUPS } from './profileAvatarPickerOptions'

export const PROFILE_AVATAR_OPTIONS = PROFILE_AVATAR_GROUPS.flatMap((group) => group.options)
export const DEFAULT_PROFILE_AVATAR = '⛵'

export function pickDefaultProfileAvatar(index: number) {
  return PROFILE_AVATAR_OPTIONS[index % PROFILE_AVATAR_OPTIONS.length] ?? DEFAULT_PROFILE_AVATAR
}
