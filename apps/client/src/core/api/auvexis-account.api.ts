import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'

export type AuvexisAccountConnectionStatus = 'connected' | 'needs_reconnect' | 'disconnected'

export interface AuvexisAccountBadge {
  id: string
  slug: string
  name: string
  backgroundColor: string
  borderColor: string
  iconUrl: string
  awardedAt: string
}

export interface AuvexisAccountProfile {
  id: string
  username: string
  email?: string
  badges: AuvexisAccountBadge[]
}

export interface AuvexisAccountStatus {
  status: AuvexisAccountConnectionStatus
  account: AuvexisAccountProfile | null
  lastValidatedAt: string | null
}

export interface AuvexisConnectStartResult {
  authorizationUrl: string
}

export interface AuvexisDisconnectResult {
  status: 'disconnected'
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
}
