import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type {
  AppNotification,
  CreateNotificationPayload,
  NotificationFilters,
  NotificationMutationCount,
  NotificationSummary,
} from '../../core/types/notification.types.ts'
import { sendDesktopNotification } from '../services/desktopNotification.service.ts'
import type { AppSettings } from './settings.store.ts'
import { useSettingsStore } from './settings.store.ts'

export interface NotificationsApiClient {
  list: (filters?: NotificationFilters) => Promise<AppNotification[]>
  create: (payload: CreateNotificationPayload) => Promise<AppNotification>
  summary: () => Promise<NotificationSummary>
  markRead: (id: string) => Promise<AppNotification>
  markAllRead: () => Promise<NotificationMutationCount>
  deleteOne: (id: string) => Promise<null>
  clear: () => Promise<NotificationMutationCount>
}

export interface NotificationStoreDeps {
  getSettings: () => AppSettings
  sendDesktopNotification: (notification: AppNotification, settings: AppSettings) => void
}

const defaultDeps: NotificationStoreDeps = {
  getSettings: () => ({}),
  sendDesktopNotification,
}

const defaultNotificationsApi: NotificationsApiClient = {
  list: (...args) =>
    import('../../core/api/notifications.api.ts').then(({ notificationsApi }) =>
      notificationsApi.list(...args),
    ),
  create: (...args) =>
    import('../../core/api/notifications.api.ts').then(({ notificationsApi }) =>
      notificationsApi.create(...args),
    ),
  summary: () =>
    import('../../core/api/notifications.api.ts').then(({ notificationsApi }) =>
      notificationsApi.summary(),
    ),
  markRead: (...args) =>
    import('../../core/api/notifications.api.ts').then(({ notificationsApi }) =>
      notificationsApi.markRead(...args),
    ),
  markAllRead: () =>
    import('../../core/api/notifications.api.ts').then(({ notificationsApi }) =>
      notificationsApi.markAllRead(),
    ),
  deleteOne: (...args) =>
    import('../../core/api/notifications.api.ts').then(({ notificationsApi }) =>
      notificationsApi.deleteOne(...args),
    ),
  clear: () =>
    import('../../core/api/notifications.api.ts').then(({ notificationsApi }) =>
      notificationsApi.clear(),
    ),
}

export function createNotificationStore(
  api: NotificationsApiClient,
  deps: NotificationStoreDeps = defaultDeps,
) {
  return defineStore('notifications', () => {
    const notifications = ref<AppNotification[]>([])
    const categories = ref<string[]>([])
    const unreadCount = ref(0)
    const selectedCategory = ref('all')
    const selectedLevel = ref<'all' | AppNotification['level']>('all')
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const filteredNotifications = computed(() =>
      notifications.value.filter((notification) => {
        const categoryMatches =
          selectedCategory.value === 'all' || notification.category === selectedCategory.value
        const levelMatches =
          selectedLevel.value === 'all' || notification.level === selectedLevel.value
        return categoryMatches && levelMatches
      }),
    )

    async function load() {
      isLoading.value = true
      error.value = null
      try {
        const [rows, summary] = await Promise.all([api.list(), api.summary()])
        notifications.value = rows
        applySummary(summary)
      } catch (cause) {
        error.value = errorMessage(cause, 'Failed to load notifications')
      } finally {
        isLoading.value = false
      }
    }

    async function persist(payload: CreateNotificationPayload) {
      error.value = null
      try {
        const created = await api.create(payload)
        const existingIndex = notifications.value.findIndex(({ id }) => id === created.id)
        if (existingIndex >= 0) notifications.value.splice(existingIndex, 1)
        notifications.value.unshift(created)
        recomputeSummary()
        deps.sendDesktopNotification(created, deps.getSettings())
        await load()
        return created
      } catch (cause) {
        error.value = errorMessage(cause, 'Failed to persist notification')
        return null
      }
    }

    async function markRead(id: string) {
      const snapshot = stateSnapshot()
      const index = notifications.value.findIndex((item) => item.id === id)
      if (index < 0) return null
      error.value = null
      if (!notifications.value[index]!.isRead) {
        notifications.value[index] = { ...notifications.value[index]!, isRead: true }
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
      try {
        const updated = await api.markRead(id)
        notifications.value[index] = updated
        return updated
      } catch (cause) {
        restoreSnapshot(snapshot)
        error.value = errorMessage(cause, 'Failed to mark notification as read')
        return null
      }
    }

    async function markAllRead() {
      const snapshot = stateSnapshot()
      error.value = null
      notifications.value = notifications.value.map((item) => ({ ...item, isRead: true }))
      unreadCount.value = 0
      try {
        return await api.markAllRead()
      } catch (cause) {
        restoreSnapshot(snapshot)
        error.value = errorMessage(cause, 'Failed to mark notifications as read')
        return null
      }
    }

    async function deleteOne(id: string) {
      const snapshot = stateSnapshot()
      error.value = null
      notifications.value = notifications.value.filter((item) => item.id !== id)
      recomputeSummary()
      try {
        await api.deleteOne(id)
        return true
      } catch (cause) {
        restoreSnapshot(snapshot)
        error.value = errorMessage(cause, 'Failed to delete notification')
        return false
      }
    }

    async function clear() {
      const snapshot = stateSnapshot()
      error.value = null
      notifications.value = []
      recomputeSummary()
      try {
        return await api.clear()
      } catch (cause) {
        restoreSnapshot(snapshot)
        error.value = errorMessage(cause, 'Failed to clear notifications')
        return null
      }
    }

    function setCategory(category: string) {
      selectedCategory.value = category
    }

    function setLevel(level: 'all' | AppNotification['level']) {
      selectedLevel.value = level
    }

    function clearProfileScopedState() {
      notifications.value = []
      categories.value = []
      unreadCount.value = 0
      selectedCategory.value = 'all'
      selectedLevel.value = 'all'
      error.value = null
      isLoading.value = false
    }

    function applySummary(summary: NotificationSummary) {
      unreadCount.value = summary.unreadCount
      categories.value = summary.categories
    }

    function recomputeSummary() {
      unreadCount.value = notifications.value.filter((item) => !item.isRead).length
      categories.value = [...new Set(notifications.value.map((item) => item.category))].sort()
      if (selectedCategory.value !== 'all' && !categories.value.includes(selectedCategory.value)) {
        selectedCategory.value = 'all'
      }
    }

    function stateSnapshot() {
      return {
        notifications: notifications.value.map((item) => ({ ...item })),
        categories: [...categories.value],
        unreadCount: unreadCount.value,
        selectedCategory: selectedCategory.value,
      }
    }

    function restoreSnapshot(snapshot: ReturnType<typeof stateSnapshot>) {
      notifications.value = snapshot.notifications
      categories.value = snapshot.categories
      unreadCount.value = snapshot.unreadCount
      selectedCategory.value = snapshot.selectedCategory
    }

    return {
      notifications,
      categories,
      unreadCount,
      selectedCategory,
      selectedLevel,
      filteredNotifications,
      isLoading,
      error,
      load,
      persist,
      markRead,
      markAllRead,
      deleteOne,
      clear,
      setCategory,
      setLevel,
      clearProfileScopedState,
    }
  })
}

export const useNotificationStore = createNotificationStore(defaultNotificationsApi, {
  getSettings: () => useSettingsStore().settings,
  sendDesktopNotification,
})

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback
}
