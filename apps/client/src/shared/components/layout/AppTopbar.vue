<template>
  <header class="app-topbar">
    <section class="app-topbar__section app-topbar__section--left" aria-label="Page controls">
      <BaseButton
        class="app-topbar__icon-button"
        type="button"
        variant="ghost"
        size="icon"
        :aria-label="sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'"
        @click="$emit('toggle-sidebar')"
      >
        <template #left>
          <LucideIcon name="grip" :size="20" />
        </template>
      </BaseButton>
      <div class="app-topbar__route-slot">
        <slot name="left"></slot>
      </div>
    </section>

    <section class="app-topbar__section app-topbar__section--center" aria-label="Active profile">
      <BaseButton
        class="app-topbar__profile-button"
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Profile menu"
        aria-expanded="false"
      >
        <template #left>
          <span class="app-topbar__avatar" aria-hidden="true">{{ activeAvatar }}</span>
        </template>
        <span class="app-topbar__profile-name">{{ activeName }}</span>
        <template #right>
          <span class="app-topbar__profile-chevrons" aria-hidden="true">
            <LucideIcon name="chevron-up" :size="12" />
            <LucideIcon name="chevron-down" :size="12" />
          </span>
        </template>
      </BaseButton>
      <span class="app-topbar__separator" aria-hidden="true">/</span>
      <div class="app-topbar__context">
        <slot name="context">{{ pageLabel }}</slot>
      </div>
    </section>

    <div class="app-topbar__section app-topbar__section--right" aria-label="Global actions">
      <span class="app-topbar__notification">
        <BaseButton
          class="app-topbar__icon-button"
          type="button"
          variant="ghost"
          size="icon"
          :aria-label="notificationAriaLabel"
          :aria-expanded="notificationUi.isOpen"
          aria-controls="global-notification-panel"
          @click="notificationUi.toggle()"
        >
          <template #left>
            <LucideIcon name="bell" :size="20" />
          </template>
        </BaseButton>
        <span
          v-if="notificationStore.unreadCount > 0"
          class="app-topbar__notification-badge"
          aria-live="polite"
          :aria-label="`${notificationStore.unreadCount} unread notifications`"
        >
          {{ notificationBadgeText }}
        </span>
      </span>
      <BaseButton
        class="app-topbar__icon-button"
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open settings"
        @click="$emit('open-settings')"
      >
        <template #left>
          <LucideIcon name="settings" :size="20" />
        </template>
      </BaseButton>
      <BaseButton
        class="app-topbar__icon-button"
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open guide book"
        @click="$emit('open-docs')"
      >
        <template #left>
          <LucideIcon name="book-open" :size="20" />
        </template>
      </BaseButton>
      <BaseButton
        class="app-topbar__command"
        type="button"
        variant="ghost"
        size="md"
        aria-label="Open command palette"
        @click="$emit('open-command-palette')"
      >
        <template #left>
          <LucideIcon name="search" :size="20" />
        </template>
        <span>Command</span>
        <kbd>Ctrl K</kbd>
      </BaseButton>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useNotificationStore } from '@/shared/stores/notification.store'
import { useNotificationUiStore } from '@/shared/stores/notification-ui.store'
import { useProfileStore } from '@/shared/stores/profile.store'

withDefaults(
  defineProps<{
    sidebarCollapsed?: boolean
    pageLabel?: string
  }>(),
  {
    sidebarCollapsed: false,
    pageLabel: 'Fabric',
  },
)

defineEmits<{
  (e: 'toggle-sidebar'): void
  (e: 'open-command-palette'): void
  (e: 'open-settings'): void
  (e: 'open-docs'): void
}>()

const profileStore = useProfileStore()
const notificationStore = useNotificationStore()
const notificationUi = useNotificationUiStore()

const activeName = computed(() => profileStore.currentProfile?.name ?? 'Profile')
const activeAvatar = computed(() => profileStore.currentProfile?.avatarEmoji ?? 'F')
const notificationBadgeText = computed(() =>
  notificationStore.unreadCount > 99 ? '99+' : String(notificationStore.unreadCount),
)
const notificationAriaLabel = computed(() =>
  notificationStore.unreadCount > 0
    ? `Open notifications, ${notificationStore.unreadCount} unread`
    : 'Open notifications',
)

onMounted(() => {
  if (!profileStore.currentProfile && !profileStore.isLoading) {
    void profileStore.loadProfiles()
  }
})
</script>

<style scoped>
.app-topbar {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: var(--fabric-space-3);
  min-height: 52px;
  padding: 0 var(--fabric-space-4);
  border-bottom: 1px solid var(--fabric-topbar-border);
  background: var(--fabric-topbar-bg);
  flex-shrink: 0;
}

.app-topbar__section {
  display: flex;
  align-items: center;
  min-width: 0;
}

.app-topbar__section--left {
  justify-content: flex-start;
  gap: var(--fabric-space-2);
}

.app-topbar__section--center {
  justify-content: center;
  gap: var(--fabric-space-2);
  min-width: 220px;
  max-width: min(46vw, 620px);
}

.app-topbar__section--right {
  justify-content: flex-end;
  gap: var(--fabric-space-1);
}

.app-topbar__route-slot,
.app-topbar__context {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.app-topbar__route-slot {
  max-width: min(34vw, 420px);
}

.app-topbar__context {
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-topbar__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-full);
  background: var(--fabric-bg-base);
  color: var(--fabric-text-primary);
  font-size: 15px;
  line-height: 1;
}

.app-topbar__profile-button {
  min-width: 0;
  max-width: 230px;
}

.app-topbar__profile-name {
  max-width: 160px;
  overflow: hidden;
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-topbar__profile-chevrons {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  color: var(--fabric-text-muted);
  line-height: 0;
}

.app-topbar__separator {
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-sm);
}

.app-topbar__notification {
  position: relative;
  display: inline-flex;
}

.app-topbar__notification-badge {
  position: absolute;
  top: calc(-1 * var(--fabric-space-1));
  right: calc(-1 * var(--fabric-space-1));
  min-width: var(--fabric-space-4);
  height: var(--fabric-space-4);
  padding: 0 var(--fabric-space-1);
  border: 1px solid var(--fabric-bg-surface);
  border-radius: var(--fabric-radius-full);
  background: var(--fabric-bg-inverse);
  color: var(--fabric-text-inverse);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-bold);
  line-height: var(--fabric-space-4);
  text-align: center;
}

.app-topbar__icon-button,
.app-topbar__command {
  color: var(--fabric-topbar-search-text);
  background: transparent;
}

.app-topbar__icon-button {
  width: 40px;
  height: 40px;
  padding: 0;
}

.app-topbar__command {
  gap: var(--fabric-space-2);
  height: 40px;
  padding: 0 var(--fabric-space-2);
}

.app-topbar__icon-button:hover,
.app-topbar__command:hover {
  color: var(--fabric-topbar-search-hover-text);
  background: var(--fabric-button-ghost-hover);
}

.app-topbar__command span {
  font-size: var(--fabric-text-sm);
}

.app-topbar__command kbd {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid var(--fabric-topbar-search-border);
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-topbar-search-text);
  background: var(--fabric-topbar-kbd-bg);
  font-family: var(--fabric-font-mono);
  font-size: 10px;
}

@media (max-width: 640px) {
  .app-topbar {
    grid-template-columns: auto minmax(0, 1fr) auto;
    padding: 0 var(--fabric-space-3);
  }

  .app-topbar__section--center {
    min-width: 0;
    max-width: none;
  }

  .app-topbar__profile-name,
  .app-topbar__route-slot,
  .app-topbar__command span {
    display: none;
  }

  .app-topbar__command kbd {
    display: none;
  }
}
</style>
