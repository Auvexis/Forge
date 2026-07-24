<template>
  <section class="notification-list" aria-label="Notification list">
    <p v-if="notificationStore.isLoading" class="notification-list__state">Loading notifications</p>
    <p v-else-if="notificationStore.error" class="notification-list__state notification-list__state--error">
      {{ notificationStore.error }}
    </p>
    <p v-else-if="visibleNotifications.length === 0" class="notification-list__state">
      No notifications
    </p>

    <TransitionGroup v-else name="notification-list" tag="div" class="notification-list__items">
      <article
        v-for="notification in visibleNotifications"
        :key="notification.id"
        class="notification-list__item"
        :class="[
          `notification-list__item--${notificationKind(notification)}`,
          {
            'notification-list__item--unread': !notification.isRead,
            'notification-list__item--read': notification.isRead,
            'notification-list__item--deleting': deletingNotificationIds.has(notification.id),
          },
        ]"
      >
        <button type="button" class="notification-list__open" @click="select(notification.id)">
          <span class="notification-list__level">
            <LucideIcon :name="notificationIcon(notification)" :size="14" />
            <span>{{ levelLabel(notification) }}</span>
          </span>
          <span class="notification-list__content">
            <strong>{{ notification.title ?? notification.message }}</strong>
            <span v-if="notification.title">{{ notification.message }}</span>
            <small>{{ categoryLabel(notification.category) }} - {{ formatDate(notification.lastOccurredAt) }}</small>
          </span>
          <span v-if="notification.occurrenceCount > 1" class="notification-list__count">
            {{ notification.occurrenceCount }}
          </span>
        </button>
        <BaseButton
          type="button"
          class="notification-list__delete"
          variant="ghost"
          size="icon"
          iconLeft="trash-2"
          aria-label="Delete notification"
          :disabled="deletingNotificationIds.has(notification.id)"
          @click="deleteNotification(notification.id)"
        />
      </article>
    </TransitionGroup>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { AppNotification } from '@/core/types/notification.types'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { useNotificationStore } from '@/shared/stores/notification.store'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const emit = defineEmits<{ select: [notificationId: string] }>()
const notificationStore = useNotificationStore()
const deletingNotificationIds = ref(new Set<string>())
const deleteTimers = new Map<string, number>()
const deleteAnimationMs = 220
const visibleNotifications = computed(() =>
  [...notificationStore.filteredNotifications].sort((left, right) => {
    const leftReward = isRewardNotification(left)
    const rightReward = isRewardNotification(right)
    if (leftReward !== rightReward) return leftReward ? -1 : 1
    return new Date(right.lastOccurredAt).getTime() - new Date(left.lastOccurredAt).getTime()
  }),
)

function select(notificationId: string) {
  if (deletingNotificationIds.value.has(notificationId)) return
  emit('select', notificationId)
}

function deleteNotification(notificationId: string) {
  if (deletingNotificationIds.value.has(notificationId)) return
  deletingNotificationIds.value = new Set(deletingNotificationIds.value).add(notificationId)
  const timer = window.setTimeout(() => {
    deleteTimers.delete(notificationId)
    void notificationStore.deleteOne(notificationId)
  }, deleteAnimationMs)
  deleteTimers.set(notificationId, timer)
}

onBeforeUnmount(() => {
  deleteTimers.forEach((timer) => window.clearTimeout(timer))
  deleteTimers.clear()
})

function levelLabel(notification: AppNotification) {
  if (isRewardNotification(notification)) return 'Reward'
  if (notification.level === 'error') return 'Error'
  if (notification.level === 'warning') return 'Warning'
  return 'Info'
}

function notificationKind(notification: AppNotification) {
  return isRewardNotification(notification) ? 'reward' : notification.level
}

function notificationIcon(notification: AppNotification) {
  if (isRewardNotification(notification)) return 'gift'
  if (notification.level === 'error') return 'circle-alert'
  if (notification.level === 'warning') return 'triangle-alert'
  return 'info'
}

function isRewardNotification(notification: AppNotification) {
  return notification.category === 'rewards'
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
  gap: var(--fabric-space-2);
  max-height: min(420px, calc(100vh - var(--fabric-space-16) - var(--fabric-space-12)));
  min-height: 0;
  overflow-y: auto;
}

.notification-list__state {
  margin: 0;
  padding: var(--fabric-space-8) var(--fabric-space-4);
  color: var(--fabric-notification-list-text-secondary);
  text-align: center;
}

.notification-list__state--error {
  color: var(--fabric-notification-list-text-error);
}

.notification-list__items {
  position: relative;
  display: grid;
  gap: var(--fabric-space-2);
}

.notification-list__item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  border: 1px solid var(--fabric-notification-list-border);
  border-radius: var(--fabric-notification-list-action-radius);
  background: var(--fabric-notification-list-bg-surface);
  color: var(--fabric-notification-list-text-primary);
  transition:
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard),
    opacity var(--fabric-duration-fast) var(--fabric-ease-standard),
    transform var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.notification-list__item:hover,
.notification-list__item:focus-within {
  border-color: var(--fabric-notification-list-border-strong);
  background: var(--fabric-notification-list-bg-elevated);
}

.notification-list__item--unread {
  color: var(--fabric-notification-list-text-primary);
}

.notification-list__item--read {
  border-color: var(--fabric-notification-list-border-muted);
  color: var(--fabric-notification-list-text-muted);
}

.notification-list__item--deleting {
  opacity: 0;
  pointer-events: none;
  transform: translateX(var(--fabric-space-8));
}

.notification-list__open {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--fabric-space-3);
  width: 100%;
  min-width: 0;
  padding: var(--fabric-space-3);
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.notification-list__level,
.notification-list__count {
  align-self: start;
  display: inline-flex;
  align-items: center;
  gap: var(--fabric-space-1);
  border-radius: var(--fabric-notification-list-item-radius);
  color: var(--fabric-notification-list-text-secondary);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
}

.notification-list__item--error .notification-list__level {
  color: var(--fabric-notification-list-text-error);
}

.notification-list__item--warning .notification-list__level {
  color: var(--fabric-notification-list-text-warning);
}

.notification-list__item--reward .notification-list__level {
  color: var(--fabric-notification-list-amber400);
}

.notification-list__item--info .notification-list__level {
  color: var(--fabric-notification-list-blue400);
}

.notification-list__content {
  display: grid;
  gap: var(--fabric-space-1);
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
  color: var(--fabric-notification-list-text-secondary);
}

.notification-list__delete {
  margin-right: var(--fabric-space-2);
  opacity: 0;
  pointer-events: none;
  transform: translateX(var(--fabric-space-1));
  transition:
    opacity var(--fabric-duration-fast) var(--fabric-ease-standard),
    transform var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.notification-list__item:hover .notification-list__delete,
.notification-list__item:focus-within .notification-list__delete {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.notification-list-move,
.notification-list-enter-active,
.notification-list-leave-active {
  transition:
    opacity var(--fabric-duration-normal) var(--fabric-ease-standard),
    transform var(--fabric-duration-normal) var(--fabric-ease-standard);
}

.notification-list-leave-active {
  position: absolute;
  right: 0;
  left: 0;
}

.notification-list-enter-from {
  opacity: 0;
  transform: translateY(var(--fabric-space-2));
}

.notification-list-leave-to {
  opacity: 0;
  transform: translateX(var(--fabric-space-8));
}
</style>
