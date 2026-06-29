<template>
  <span class="notification-trigger">
    <BaseButton
      type="button"
      variant="ghost"
      size="icon"
      iconLeft="bell"
      :aria-label="ariaLabel"
      :aria-expanded="notificationUi.isOpen"
      aria-controls="global-notification-panel"
      @click="notificationUi.toggle()"
    />
    <span
      v-if="notificationStore.unreadCount > 0"
      class="notification-trigger__badge"
      aria-live="polite"
      :aria-label="`${notificationStore.unreadCount} unread notifications`"
    >
      {{ badgeText }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { useNotificationStore } from '@/shared/stores/notification.store'
import { useNotificationUiStore } from '@/shared/stores/notification-ui.store'

const notificationStore = useNotificationStore()
const notificationUi = useNotificationUiStore()

const badgeText = computed(() =>
  notificationStore.unreadCount > 99 ? '99+' : String(notificationStore.unreadCount),
)
const ariaLabel = computed(() =>
  notificationStore.unreadCount > 0
    ? `Open notifications, ${notificationStore.unreadCount} unread`
    : 'Open notifications',
)
</script>

<style scoped>
.notification-trigger {
  position: relative;
  display: inline-flex;
}

.notification-trigger__badge {
  position: absolute;
  top: calc(-1 * var(--sailor-space-1));
  right: calc(-1 * var(--sailor-space-1));
  min-width: var(--sailor-space-4);
  height: var(--sailor-space-4);
  padding: 0 var(--sailor-space-1);
  border: 1px solid var(--sailor-bg-surface);
  border-radius: var(--sailor-radius-full);
  background: var(--sailor-red-500);
  color: var(--sailor-text-inverse);
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-bold);
  line-height: var(--sailor-space-4);
  text-align: center;
}
</style>
