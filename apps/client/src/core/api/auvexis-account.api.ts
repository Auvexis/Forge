import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'

export type AuvexisAccountConnectionStatus = 'connected' | 'needs_reconnect' | 'disconnected'

export interface AuvexisAccountBadge {
  id: string
  slug: string
  name: string
  style: {
    backgroundColor: string
    borderColor: string
    textColor: string
  }
  iconUrl: string | null
  description?: string | null
  permissions?: Record<string, Record<string, boolean>>
  awardedAt: string
}

export interface AuvexisAccountProfile {
  id: string
  username: string
  displayName?: string | null
  email?: string
  avatarUrl?: string | null
  profileImageUrl?: string | null
  pictureUrl?: string | null
  photoUrl?: string | null
  badges: AuvexisAccountBadge[]
}

export interface AuvexisAccountStatus {
  status: AuvexisAccountConnectionStatus
  account: AuvexisAccountProfile | null
  capabilities: {
    canUseDonatorTheme: boolean
    canCreateMoreThan6Workflows: boolean
  }
  lastValidatedAt: string | null
}

export interface AuvexisConnectStartResult {
  authorizationUrl: string
}

export interface AuvexisDisconnectResult {
  status: 'disconnected'
}

export interface AuvexisProductEventInput {
  type: string
  eventId?: string
  occurredAt?: string
  evidence?: Record<string, string>
}

export interface AuvexisProductEventResult {
  eventId: string
  productId: string
  status: 'accepted'
  outcomes: Array<{
    campaignId: string
    outcome: 'claimed' | 'already_claimed' | 'ineligible' | 'failed'
    reason: string | null
  }>
}

export const auvexisAccountApi = {
  getStatus: () => apiRequest<AuvexisAccountStatus>(ENDPOINTS.AUVEXIS_ACCOUNT),

  startConnect: () =>
    apiRequest<AuvexisConnectStartResult>(ENDPOINTS.AUVEXIS_ACCOUNT_CONNECT_START, {
      method: 'POST',
    }),

  logout: () =>
    apiRequest<AuvexisDisconnectResult>(ENDPOINTS.AUVEXIS_ACCOUNT_LOGOUT, {
      method: 'POST',
    }),

  revoke: () =>
    apiRequest<AuvexisDisconnectResult>(ENDPOINTS.AUVEXIS_ACCOUNT_REVOKE, {
      method: 'POST',
    }),

  emitProductEvent: (input: AuvexisProductEventInput) =>
    apiRequest<AuvexisProductEventResult>(ENDPOINTS.AUVEXIS_EVENTS, {
      method: 'POST',
      body: input,
    }),
}
