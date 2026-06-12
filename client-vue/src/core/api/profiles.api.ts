import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'

export interface ProfileSummary {
  id: string
  name: string
  avatarEmoji: string
  email: string | null
  passwordProtected: boolean
}

export interface CreateProfilePayload {
  id?: string
  name: string
  avatarEmoji: string
  email?: string | null
}

export interface UpdateProfilePayload {
  name?: string
  avatarEmoji?: string
  email?: string | null
}

export interface VerifyProfilePasswordResult {
  valid: boolean
}

export const profilesApi = {
  list: () => apiRequest<ProfileSummary[]>(ENDPOINTS.PROFILES),

  getCurrent: () => apiRequest<ProfileSummary>(ENDPOINTS.PROFILES_CURRENT),

  create: (payload: CreateProfilePayload) =>
    apiRequest<ProfileSummary>(ENDPOINTS.PROFILES, {
      method: 'POST',
      body: payload,
    }),

  update: (profileId: string, payload: UpdateProfilePayload) =>
    apiRequest<ProfileSummary>(ENDPOINTS.PROFILE_BY_ID(profileId), {
      method: 'PATCH',
      body: payload,
    }),

  setPassword: (profileId: string, password: string) =>
    apiRequest<ProfileSummary>(ENDPOINTS.PROFILE_PASSWORD(profileId), {
      method: 'PUT',
      body: { password },
    }),

  removePassword: (profileId: string) =>
    apiRequest<ProfileSummary>(ENDPOINTS.PROFILE_PASSWORD(profileId), {
      method: 'DELETE',
    }),

  verifyPassword: (profileId: string, password: string) =>
    apiRequest<VerifyProfilePasswordResult>(ENDPOINTS.PROFILE_VERIFY_PASSWORD(profileId), {
      method: 'POST',
      body: { password },
    }),

  switchProfile: (profileId: string, password?: string) =>
    apiRequest<ProfileSummary>(ENDPOINTS.PROFILE_SWITCH(profileId), {
      method: 'POST',
      body: password ? { password } : undefined,
    }),

  delete: (profileId: string) =>
    apiRequest<null>(ENDPOINTS.PROFILE_BY_ID(profileId), {
      method: 'DELETE',
    }),
}
