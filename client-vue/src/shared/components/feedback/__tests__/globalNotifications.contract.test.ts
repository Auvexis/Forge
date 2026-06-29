import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../../../..')

function source(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('global notifications UI contract', () => {
  it('provides a reusable BaseButton bell trigger with unread badge and UI-store toggle', () => {
    const trigger = source('src/shared/components/feedback/NotificationTrigger.vue')

    assert.match(trigger, /BaseButton/)
    assert.match(trigger, /iconLeft="bell"/)
    assert.match(trigger, /useNotificationStore/)
    assert.match(trigger, /useNotificationUiStore/)
    assert.match(trigger, /notificationUi\.toggle\(\)/)
    assert.match(trigger, /aria-label/)
    assert.match(trigger, /notification-trigger__badge/)
    assert.match(trigger, /background:\s*var\(--sailor-bg-inverse\)/)
    assert.match(trigger, /color:\s*var\(--sailor-text-inverse\)/)
  })

  it('provides one top-centered global panel with filters, actions, keyboard handling, and detail transition', () => {
    const panel = source('src/shared/components/feedback/GlobalNotificationPanel.vue')

    assert.match(panel, /notification-panel__shell/)
    assert.match(panel, /notification-panel__backdrop/)
    assert.match(panel, /@click="closePanel"/)
    assert.match(panel, /notification-panel--top-centered/)
    assert.match(panel, /notification-panel-top/)
    assert.match(panel, /@keydown\.esc/)
    assert.match(panel, /NotificationList/)
    assert.match(panel, /NotificationDetail/)
    assert.match(panel, /notification-detail-slide/)
    assert.match(panel, /BaseDropdownSelect/)
    assert.match(panel, /markAllRead/)
    assert.match(panel, /confirmClearAll/)
    assert.match(panel, /focusOrigin/)
  })

  it('renders dynamic categories and level filters without marking rows read on open', () => {
    const panel = source('src/shared/components/feedback/GlobalNotificationPanel.vue')
    const list = source('src/shared/components/feedback/NotificationList.vue')

    assert.match(panel, /notification-panel__tabs-carousel/)
    assert.match(panel, /notification-panel__tabs-track/)
    assert.match(panel, /notification-panel__controls/)
    assert.match(panel, /notification-panel__body/)
    assert.match(panel, /notification-panel__body--detail/)
    assert.match(panel, /hasNotifications/)
    assert.match(panel, /actionOptions/)
    assert.match(panel, /handleActionSelect/)
    assert.match(panel, /categoryTabs/)
    assert.match(panel, /label:\s*'Global'/)
    assert.match(panel, /category !== 'global'/)
    assert.match(panel, /setCategory/)
    assert.match(panel, /setLevel/)
    assert.match(panel, /overflow:\s*visible/)
    assert.match(list, /isLoading/)
    assert.match(list, /filteredNotifications/)
    assert.doesNotMatch(panel, /markRead\([^)]*\).*open/s)
    assert.doesNotMatch(panel, /class="notification-panel__filters"/)
    assert.doesNotMatch(panel, /class="notification-panel__actions"/)
  })

  it('marks only selected notifications read and supports detail metadata, delete, and internal action navigation', () => {
    const detail = source('src/shared/components/feedback/NotificationDetail.vue')
    const list = source('src/shared/components/feedback/NotificationList.vue')

    assert.match(detail, /markRead/)
    assert.match(detail, /detailNotificationId/)
    assert.match(detail, /router\.push/)
    assert.match(detail, /actionUrl/)
    assert.match(detail, /actionLabel/)
    assert.match(detail, /occurrenceCount/)
    assert.match(detail, /JSON\.stringify/)
    assert.match(detail, /deleteOne/)
    assert.match(list, /TransitionGroup/)
    assert.match(list, /notification-list__delete/)
    assert.match(list, /iconLeft="trash-2"/)
    assert.match(list, /deleteNotification/)
    assert.match(list, /deletingNotificationIds/)
    assert.match(list, /notification-list__item--deleting/)
    assert.match(list, /window\.setTimeout/)
    assert.match(list, /notification-list-move/)
    assert.doesNotMatch(list, /border-color:\s*var\(--sailor-border-brand\)/)
    assert.match(list, /notification-list__item--read/)
    assert.match(list, /notification-list-leave-to/)
  })

  it('uses theme tokens and reduced-motion transition classes', () => {
    const panel = source('src/shared/components/feedback/GlobalNotificationPanel.vue')
    const trigger = source('src/shared/components/feedback/NotificationTrigger.vue')
    const transitions = source('src/assets/styles/transitions.css')

    assert.doesNotMatch(panel, /#[0-9a-fA-F]{3,8}/)
    assert.doesNotMatch(trigger, /#[0-9a-fA-F]{3,8}/)
    assert.match(panel, /inset:\s*0/)
    assert.match(panel, /border-radius:\s*0 0 var\(--sailor-radius-sm\) var\(--sailor-radius-sm\)/)
    assert.match(panel, /background:\s*var\(--sailor-bg-surface\)/)
    assert.match(panel, /height:\s*min\(720px,\s*calc\(100vh - var\(--sailor-space-4\)\)\)/)
    assert.match(panel, /grid-template-rows:\s*auto minmax\(0,\s*1fr\)/)
    assert.match(panel, /\.notification-panel__backdrop\s*{[^}]*inset:\s*0/s)
    assert.match(panel, /\.notification-panel__backdrop\s*{[^}]*background:\s*transparent/s)
    assert.doesNotMatch(panel, /\.notification-panel__detail-view\s*{[^}]*border:/s)
    assert.doesNotMatch(panel, /\.notification-panel__detail-view\s*{[^}]*padding:/s)
    assert.doesNotMatch(panel, /\.notification-panel__detail-view\s*{[^}]*box-shadow:/s)
    assert.match(panel, /var\(--sailor-/)
    assert.match(trigger, /var\(--sailor-/)
    assert.match(transitions, /notification-panel-top/)
    assert.match(transitions, /translateY\(-100%\)/)
    assert.match(transitions, /notification-detail-slide/)
    assert.match(transitions, /prefers-reduced-motion: reduce/)
  })

  it('mounts exactly one global panel in the app overlay host', () => {
    const app = source('src/app/App.vue')
    const panelRefs = app.match(/<GlobalNotificationPanel \/>/g) ?? []

    assert.equal(panelRefs.length, 1)
    assert.match(app, /import GlobalNotificationPanel/)
    assert.match(app, /<GlobalNotificationPanel \/>/)
  })
})
