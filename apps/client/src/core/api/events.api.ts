// ─────────────────────────────────────────────────────────────
//  Events API
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'

export const eventsApi = {
  /** Emit an internal event that workflows can listen to */
  emit: (name: string, payload: Record<string, unknown> = {}) =>
    apiRequest<{ triggered: number }>(ENDPOINTS.EVENTS_EMIT, {
      method: 'POST',
      body: { name, payload },
    }),
}
