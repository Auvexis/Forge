export type NotificationLevel = 'error' | 'warning' | 'info'

export interface AppNotification {
  id: string
  level: NotificationLevel
  category: string
  title: string | null
  message: string
  source: string | null
  context: unknown | null
  actionUrl: string | null
  actionLabel: string | null
  isRead: boolean
  occurrenceCount: number
  createdAt: string
  lastOccurredAt: string
}

export interface CreateNotificationPayload {
  level: NotificationLevel
  category?: string
  title?: string
  message: string
  source?: string
  context?: unknown
  actionUrl?: string
  actionLabel?: string
}

export type NotificationFilters = {
  category?: string
  level?: NotificationLevel
  unread?: boolean
}

export interface NotificationSummary {
  unreadCount: number
  categories: string[]
}

export interface NotificationMutationCount {
  updated?: number
  deleted?: number
}
