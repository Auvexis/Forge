export interface ProfileSwitcherSummary {
  id: string
  name: string
  avatarEmoji: string
  email: string | null
  passwordProtected: boolean
}

export interface ProfileSwitcherAction {
  id: 'switch-profile' | 'sign-out' | 'edit-profile'
  label: string
  icon: string
  hint?: string
  danger?: boolean
}

export const profileSwitcherUsesActiveAvatar = true

export function profileSwitcherTriggerLabel(profile: ProfileSwitcherSummary | null): string {
  if (!profile) return '⛵ Profile'
  return `${profile.avatarEmoji} ${profile.name}`
}

export function buildProfileSwitcherActions(
  _profile: ProfileSwitcherSummary,
): ProfileSwitcherAction[] {
  return [
    {
      id: 'edit-profile',
      label: 'Edit Profile',
      icon: 'pencil',
    },
    {
      id: 'switch-profile',
      label: 'Switch profile',
      icon: 'users',
      hint: 'Choose another profile',
    },
    {
      id: 'sign-out',
      label: 'Sign out',
      icon: 'log-out',
      hint: 'Return to profile selection',
    },
  ]
}
