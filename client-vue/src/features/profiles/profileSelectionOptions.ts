export const PROFILE_AVATAR_OPTIONS = ['⛵', '🧭', '🚢', '⚓', '🌊', '🪝', '🛟', '🗺️'] as const

export function pickDefaultProfileAvatar(index: number) {
  return PROFILE_AVATAR_OPTIONS[index % PROFILE_AVATAR_OPTIONS.length] ?? PROFILE_AVATAR_OPTIONS[0]
}
