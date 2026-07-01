import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  profilesApi,
  type CreateProfilePayload,
  type ProfileSummary,
  type UpdateProfilePayload,
} from '@/core/api/profiles.api'
import { compareProfilesForLoginList } from '@/features/profiles/profileListRules'
import { refreshAfterProfileSwitch } from '@/features/profiles/profileSwitchRefresh'

export const useProfileStore = defineStore('profile', () => {
  const profiles = ref<ProfileSummary[]>([])
  const currentProfile = ref<ProfileSummary | null>(null)
  const isLoading = ref(false)
  const isSwitching = ref(false)
  const error = ref<string | null>(null)

  const sortedProfiles = computed(() => [...profiles.value].sort(compareProfilesForLoginList))

  function setProfile(profile: ProfileSummary) {
    const index = profiles.value.findIndex((item) => item.id === profile.id)
    if (index >= 0) {
      profiles.value[index] = profile
    } else {
      profiles.value.push(profile)
    }

    if (currentProfile.value?.id === profile.id) {
      currentProfile.value = profile
    }
  }

  async function loadProfiles() {
    isLoading.value = true
    error.value = null
    try {
      const [items, current] = await Promise.all([profilesApi.list(), profilesApi.getCurrent()])
      profiles.value = items
      currentProfile.value = current
      setProfile(current)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load profiles'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createProfile(payload: CreateProfilePayload) {
    error.value = null
    const created = await profilesApi.create(payload)
    setProfile(created)
    return created
  }

  async function updateProfile(profileId: string, payload: UpdateProfilePayload) {
    error.value = null
    const updated = await profilesApi.update(profileId, payload)
    setProfile(updated)
    return updated
  }

  async function setPassword(profileId: string, password: string) {
    error.value = null
    const updated = await profilesApi.setPassword(profileId, password)
    setProfile(updated)
    return updated
  }

  async function verifyPassword(profileId: string, password: string) {
    error.value = null
    return profilesApi.verifyPassword(profileId, password)
  }

  async function removePassword(profileId: string) {
    error.value = null
    const updated = await profilesApi.removePassword(profileId)
    setProfile(updated)
    return updated
  }

  async function switchProfile(profileId: string, password?: string) {
    isSwitching.value = true
    error.value = null
    try {
      const switched = await profilesApi.switchProfile(profileId, password)
      currentProfile.value = switched
      setProfile(switched)
      await refreshAfterProfileSwitch()
      return switched
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to switch profile'
      throw err
    } finally {
      isSwitching.value = false
    }
  }

  async function deleteProfile(profileId: string) {
    error.value = null
    await profilesApi.delete(profileId)
    profiles.value = profiles.value.filter((profile) => profile.id !== profileId)
  }

  function selectedProfileRequiresPassword(profileId: string) {
    return profiles.value.some((profile) => profile.id === profileId && profile.passwordProtected)
  }

  function clearError() {
    error.value = null
  }

  return {
    profiles,
    sortedProfiles,
    currentProfile,
    isLoading,
    isSwitching,
    error,
    loadProfiles,
    createProfile,
    updateProfile,
    setPassword,
    verifyPassword,
    removePassword,
    switchProfile,
    deleteProfile,
    selectedProfileRequiresPassword,
    clearError,
  }
})
