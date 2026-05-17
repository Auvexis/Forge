export interface ProfileAvatarPickerGroup {
  label: string
  options: string[]
}

export const PROFILE_AVATAR_RECENT_STORAGE_KEY = 'sailor.profile.recentAvatars'

export const PROFILE_AVATAR_GROUPS: ProfileAvatarPickerGroup[] = [
  {
    label: 'Sea',
    options: ['⛵', '🧭', '🚢', '⚓', '🌊', '🛟', '🗺️', '🏝️'],
  },
  {
    label: 'Work',
    options: ['💼', '🧰', '🧪', '📊', '📚', '🧠', '💡', '🛠️'],
  },
  {
    label: 'Energy',
    options: ['⚡', '🔥', '✨', '🚀', '🌙', '⭐', '🌱', '💎'],
  },
]

export function isEmojiAvatarOption(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 8) return false
  if (/https?:|data:|<svg|<\/|\.png|\.jpg|\.jpeg|\.webp/i.test(trimmed)) return false
  return /\p{Extended_Pictographic}/u.test(trimmed)
}

export function rememberProfileAvatar(current: string[], selected: string, limit = 6): string[] {
  if (!isEmojiAvatarOption(selected)) return current.filter(isEmojiAvatarOption).slice(0, limit)

  return [selected, ...current.filter((emoji) => emoji !== selected && isEmojiAvatarOption(emoji))].slice(
    0,
    limit,
  )
}

export function buildProfileAvatarPickerGroups(recent: string[] = []): ProfileAvatarPickerGroup[] {
  const recentOptions = recent.filter(isEmojiAvatarOption)

  return [
    ...(recentOptions.length > 0 ? [{ label: 'Recent', options: recentOptions }] : []),
    ...PROFILE_AVATAR_GROUPS,
  ]
}
