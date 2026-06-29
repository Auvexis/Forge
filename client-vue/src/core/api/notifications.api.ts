import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'
import type {
  AppNotification,
  CreateNotificationPayload,
  NotificationFilters,
  NotificationMutationCount,
  NotificationSummary,
} from '../types/notification.types'

export const notificationsApi = {
  list: (filters: NotificationFilters = {}) =>
    apiRequest<AppNotification[]>(ENDPOINTS.NOTIFICATIONS, { params: filters }),

  create: (payload: CreateNotificationPayload) =>
    apiRequest<AppNotification>(ENDPOINTS.NOTIFICATIONS, {
      method: 'POST',
      body: payload,
    }),

  summary: () => apiRequest<NotificationSummary>(ENDPOINTS.NOTIFICATIONS_SUMMARY),

  markRead: (id: string) =>
    apiRequest<AppNotification>(ENDPOINTS.NOTIFICATION_READ(id), { method: 'PATCH' }),

  markAllRead: () =>
    apiRequest<NotificationMutationCount>(ENDPOINTS.NOTIFICATIONS_READ_ALL, { method: 'PATCH' }),

  deleteOne: (id: string) =>
    apiRequest<null>(ENDPOINTS.NOTIFICATION_BY_ID(id), { method: 'DELETE' }),

  clear: () =>
    apiRequest<NotificationMutationCount>(ENDPOINTS.NOTIFICATIONS, { method: 'DELETE' }),
}
