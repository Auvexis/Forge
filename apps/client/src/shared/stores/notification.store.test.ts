import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import type {
  AppNotification,
  CreateNotificationPayload,
  NotificationFilters,
  NotificationSummary,
} from '@/core/types/notification.types'
import {
  createNotificationStore,
  type NotificationsApiClient,
} from './notification.store.ts'
import { useNotificationUiStore } from './notification-ui.store.ts'

const first: AppNotification = {
  id: 'one',
  level: 'error',
  category: 'workflows',
  title: 'Failed',
  message: 'Workflow failed',
  source: 'workflow-editor',
  context: { workflowId: 'workflow-1' },
  actionUrl: '/workflows/workflow-1',
  actionLabel: 'Open workflow',
  isRead: false,
  occurrenceCount: 1,
  createdAt: '2026-06-28T10:00:00.000Z',
  lastOccurredAt: '2026-06-28T10:00:00.000Z',
}

const second: AppNotification = {
  ...first,
  id: 'two',
  level: 'warning',
  category: 'pages',
  title: null,
  message: 'Page warning',
  isRead: true,
}

class FakeNotificationsApi implements NotificationsApiClient {
  rows = [structuredClone(first), structuredClone(second)]
  failNextMutation = false
  listCalls = 0

  async list(_filters: NotificationFilters = {}) {
    this.listCalls += 1
    return structuredClone(this.rows)
  }

  async create(payload: CreateNotificationPayload) {
    const created = { ...structuredClone(first), ...payload, id: 'created' }
    this.rows.unshift(created)
    return structuredClone(created)
  }

  async summary(): Promise<NotificationSummary> {
    return {
      unreadCount: this.rows.filter((item) => !item.isRead).length,
      categories: [...new Set(this.rows.map((item) => item.category))].sort(),
    }
  }

  async markRead(id: string) {
    this.maybeFail()
    const row = this.rows.find((item) => item.id === id)!
    row.isRead = true
    return structuredClone(row)
  }

  async markAllRead() {
    this.maybeFail()
    const updated = this.rows.filter((item) => !item.isRead).length
    this.rows.forEach((item) => (item.isRead = true))
    return { updated }
  }

  async deleteOne(id: string) {
    this.maybeFail()
    this.rows = this.rows.filter((item) => item.id !== id)
    return null
  }

  async clear() {
    this.maybeFail()
    const deleted = this.rows.length
    this.rows = []
    return { deleted }
  }

  private maybeFail() {
    if (!this.failNextMutation) return
    this.failNextMutation = false
    throw new Error('mutation failed')
  }
}

describe('notification store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loads notifications, categories and unread count and filters locally', async () => {
    const api = new FakeNotificationsApi()
    const store = createNotificationStore(api)()

    await store.load()
    store.setCategory('workflows')
    store.setLevel('error')

    assert.equal(store.unreadCount, 1)
    assert.deepEqual(store.categories, ['pages', 'workflows'])
    assert.deepEqual(store.filteredNotifications.map(({ id }) => id), ['one'])
    assert.equal(store.isLoading, false)
  })

  it('persists a notification and updates list and summary', async () => {
    const api = new FakeNotificationsApi()
    const store = createNotificationStore(api)()
    await store.load()

    const created = await store.persist({ level: 'info', category: 'agents', message: 'Agent info' })

    assert.equal(created?.id, 'created')
    assert.equal(store.notifications[0]?.category, 'agents')
    assert.equal(store.unreadCount, 2)
    assert.deepEqual(store.categories, ['agents', 'pages', 'workflows'])
    assert.equal(api.listCalls, 2)
  })

  it('marks only one notification read', async () => {
    const api = new FakeNotificationsApi()
    const store = createNotificationStore(api)()
    await store.load()

    await store.markRead('one')

    assert.equal(store.notifications.find(({ id }) => id === 'one')?.isRead, true)
    assert.equal(store.notifications.find(({ id }) => id === 'two')?.isRead, true)
    assert.equal(store.unreadCount, 0)
  })

  it('restores optimistic state when a mutation fails', async () => {
    const api = new FakeNotificationsApi()
    const store = createNotificationStore(api)()
    await store.load()
    api.failNextMutation = true

    const result = await store.markRead('one')

    assert.equal(result, null)
    assert.equal(store.notifications.find(({ id }) => id === 'one')?.isRead, false)
    assert.equal(store.unreadCount, 1)
    assert.equal(store.error, 'mutation failed')
  })

  it('marks all, deletes one and clears all notifications', async () => {
    const api = new FakeNotificationsApi()
    const store = createNotificationStore(api)()
    await store.load()

    await store.markAllRead()
    assert.equal(store.unreadCount, 0)
    await store.deleteOne('two')
    assert.deepEqual(store.categories, ['workflows'])
    await store.clear()
    assert.deepEqual(store.notifications, [])
    assert.deepEqual(store.categories, [])
  })

  it('clears all profile-scoped state before a profile reload', async () => {
    const api = new FakeNotificationsApi()
    const store = createNotificationStore(api)()
    await store.load()
    store.setCategory('pages')

    store.clearProfileScopedState()

    assert.deepEqual(store.notifications, [])
    assert.deepEqual(store.categories, [])
    assert.equal(store.unreadCount, 0)
    assert.equal(store.selectedCategory, 'all')
  })
})

describe('notification ui store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('controls the global panel and detail subview independently', () => {
    const store = useNotificationUiStore()

    store.open()
    store.showDetail('one')
    assert.equal(store.isOpen, true)
    assert.equal(store.detailNotificationId, 'one')

    store.backToList()
    assert.equal(store.detailNotificationId, null)
    store.close()
    assert.equal(store.isOpen, false)
  })
})
