import { useProfileStore } from './profile.store'
import type { ProfileSummary } from '@/core/api/profiles.api'

async function contract(profile: ProfileSummary) {
  const store = useProfileStore()

  await store.loadProfiles()
  await store.createProfile({
    name: 'Team Ops',
    avatarEmoji: '🧭',
    email: 'ops@example.com',
  })
  await store.switchProfile(profile.id)
  await store.switchProfile(profile.id, 'secret')
  await store.updateProfile(profile.id, { name: 'Renamed', avatarEmoji: '🚢', email: null })
  await store.setPassword(profile.id, 'secret')
  await store.removePassword(profile.id)
  await store.deleteProfile(profile.id)

  return {
    active: store.currentProfile?.id,
    selectedRequiresPassword: store.selectedProfileRequiresPassword(profile.id),
    keepsPasswordOutOfState: 'secret' in store ? false : true,
  }
}

void contract({
  id: 'team-ops',
  name: 'Team Ops',
  avatarEmoji: '🧭',
  email: null,
  passwordProtected: true,
})
