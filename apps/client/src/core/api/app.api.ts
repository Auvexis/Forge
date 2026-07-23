import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'

export interface AppInfo {
  publicUrl: string
  source?: 'setting' | 'env' | 'default'
  pendingPublicUrl?: string | null
  locked?: boolean
  restartRequired?: boolean
}

export const appApi = {
  /**
   * Fetches public app configuration from the backend
   */
  getInfo: () => apiRequest<AppInfo>(ENDPOINTS.APP_INFO),
}
