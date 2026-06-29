<template>
  <section class="notification-list" aria-label="Notification list">
    <p v-if="notificationStore.isLoading" class="notification-list__state">Loading notifications</p>
    <p v-else-if="notificationStore.error" class="notification-list__state notification-list__state--error">
      {{ notificationStore.error }}
    </p>
    <p v-else-if="notificationStore.filteredNotifications.length === 0" class="notification-list__state">
      No notifications
    </p>

    <button
      v-for="notification in notificationStore.filteredNotifications"
      v-else
      :key="notification.id"
      type="button"
      class="notification-list__item"
      :class="[
        `notification-list__item--${notification.level}`,
        { 'notification-list__item--unread': !notification.isRead },
      ]"
      @click="select(notification.id)"
    >
      <span class="notification-list__level">{{ levelLabel(notification.level) }}</span>
      <span class="notification-list__content">
        <strong>{{ notification.title ?? notification.message }}</strong>
        <span v-if="notification.title">{{ notification.message }}</span>
        <small>{{ categoryLabel(notification.category) }} · {{ formatDate(notification.lastOccurredAt) }}</small>
      </span>
      <span v-if="notification.occurrenceCount > 1" class="notification-list__count">
        {{ notification.occurrenceCount }}
      </span>
    </button>
  </section>
</template>

<script setup lang="ts">
import type { NotificationLevel } from '@/core/types/notification.types'
import { useNotificationStore } from '@/shared/stores/notification.store'

const emit = defineEmits<{ select: [notificationId: string] }>()
const notificationStore = useNotificationStore()

function select(notificationId: string) {
  emit('select', notificationId)
}

function levelLabel(level: NotificationLevel) {
  if (level === 'error') return 'Error'
  if (level === 'warning') return 'Warning'
  return 'Info'
}

function categoryLabel(category: string) {
  return category
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
</script>

<style scoped>
.notification-list {
  display: grid;
  gap: var(--sailor-space-2);
}

.notification-list__state {
  margin: 0;
  padding: var(--sailor-space-8) var(--sailor-space-4);
  color: var(--sailor-text-secondary);
  text-align: center;
}

.notification-list__state--error {
  color: var(--sailor-text-error);
}

.notification-list__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--sailor-space-3);
  width: 100%;
  padding: var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  text-align: left;
  cursor: pointer;
}

.notification-list__item:hover,
.notification-list__item:focus-visible {
  border-color: var(--sailor-border-strong);
  background: var(--sailor-bg-elevated);
}

.notification-list__item--unread {
  border-color: var(--sailor-border-brand);
}

.notification-list__level,
.notification-list__count {
  align-self: start;
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-semibold);
}

.notification-list__item--error .notification-list__level {
  color: var(--sailor-text-error);
}

.notification-list__item--warning .notification-list__level {
  color: var(--sailor-text-warning);
}

.notification-list__item--info .notification-list__level {
  color: var(--sailor-blue-400);
}

.notification-list__content {
  display: grid;
  gap: var(--sailor-space-1);
  min-width: 0;
}

.notification-list__content strong,
.notification-list__content span,
.notification-list__content small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-list__content span,
.notification-list__content small {
  color: var(--sailor-text-secondary);
}
</style>
