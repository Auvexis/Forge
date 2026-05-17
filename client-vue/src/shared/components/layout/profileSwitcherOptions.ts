export interface ProfileSwitcherSummary {
  id: string
  name: string
  avatarEmoji: string
  email: string | null
  passwordProtected: boolean
}

export interface ProfileSwitcherAction {
  id:
    | 'switch-profile'
    | 'sign-out'
    | 'profile-settings'
    | 'rename-profile'
    | 'change-avatar'
    | 'change-email'
    | 'set-password'
    | 'remove-password'
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

export function buildProfileSwitcherActions(profile: ProfileSwitcherSummary): ProfileSwitcherAction[] {
  return [
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
    {
      id: 'profile-settings',
      label: 'Profile settings',
      icon: 'settings',
    },
    {
      id: 'rename-profile',
      label: 'Rename',
      icon: 'pencil',
    },
    {
      id: 'change-avatar',
      label: 'Change avatar',
      icon: 'smile',
    },
    {
      id: 'change-email',
      label: profile.email ? 'Change email' : 'Add email',
      icon: 'mail',
    },
    profile.passwordProtected
      ? {
          id: 'remove-password',
          label: 'Remove password',
          icon: 'lock-open',
          danger: true,
        }
      : {
          id: 'set-password',
          label: 'Set password',
          icon: 'lock',
        },
  ]
}
