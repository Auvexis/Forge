<template>
  <header class="app-topbar">
    <section class="app-topbar__section app-topbar__section--left" aria-label="Page controls">
      <BaseTopbarButton
        class="app-topbar__icon-button"
        type="button"
        width="40px"
        height="40px"
        :aria-label="sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'"
        @click="$emit('toggle-sidebar')"
      >
        <template #left>
          <LucideIcon name="grip" :size="25" />
        </template>
      </BaseTopbarButton>
      <BaseTopbarButton
        class="app-topbar__icon-button"
        type="button"
        width="40px"
        height="40px"
        aria-label="Open home"
        @click="$emit('open-home')"
      >
        <template #left>
          <LucideIcon name="home" :size="18" />
        </template>
      </BaseTopbarButton>
      <div class="app-topbar__route-slot">
        <div id="fabric-topbar-left" class="app-topbar__portal" />
        <slot name="left"></slot>
      </div>
    </section>

    <section class="app-topbar__section app-topbar__section--center" aria-label="Active profile">
      <BaseProfileDropdown
        :profile-name="activeName"
        :avatar="activeAvatar"
        :auvexis-account="auvexisAccountStore.account"
        @open="handleProfileDropdownOpen"
        @action="handleProfileDropdownAction"
      >
        <template #trigger="{ open }">
          <BaseTopbarButton
            class="app-topbar__profile-button"
            type="button"
            height="40px"
            aria-label="Profile menu"
            :aria-expanded="open"
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
          </BaseTopbarButton>
        </template>
      </BaseProfileDropdown>
      <span class="app-topbar__separator" aria-hidden="true">/</span>
      <div class="app-topbar__context">
        <div id="fabric-topbar-context" class="app-topbar__portal" />
        <span class="app-topbar__fallback">
          <slot name="context">{{ pageLabel }}</slot>
        </span>
      </div>
    </section>

    <div class="app-topbar__section app-topbar__section--right" aria-label="Global actions">
      <span class="app-topbar__notification">
        <BaseTopbarButton
          class="app-topbar__icon-button"
          type="button"
          width="40px"
          height="40px"
          :aria-label="notificationAriaLabel"
          :aria-expanded="notificationUi.isOpen"
          aria-controls="global-notification-panel"
          @click="notificationUi.toggle()"
        >
          <template #left>
            <LucideIcon name="bell" :size="18" />
          </template>
        </BaseTopbarButton>
        <span
          v-if="notificationStore.unreadCount > 0"
          class="app-topbar__notification-badge"
          aria-live="polite"
          :aria-label="`${notificationStore.unreadCount} unread notifications`"
        >
          {{ notificationBadgeText }}
        </span>
      </span>
      <BaseTopbarButton
        class="app-topbar__action-button app-topbar__action-button--icon-only"
        type="button"
        height="40px"
        aria-label="Open settings"
        @click="$emit('open-settings')"
      >
        <template #left>
          <LucideIcon name="settings" :size="18" />
        </template>
      </BaseTopbarButton>

      <BaseTopbarButton
        class="app-topbar__action-button app-topbar__command"
        type="button"
        height="40px"
        gap="var(--fabric-space-2)"
        aria-label="Open command palette"
        @click="$emit('open-command-palette')"
      >
        <template #left>
          <LucideIcon name="search" :size="18" />
        </template>
        <span>Command</span>
      </BaseTopbarButton>

      <div v-if="isDesktopWindow" class="app-topbar__window-controls" aria-label="Window controls">
        <button
          class="app-topbar__window-control"
          type="button"
          aria-label="Minimize window"
          @click="minimizeWindow"
        >
          <LucideIcon name="minus" :size="14" />
        </button>
        <button
          class="app-topbar__window-control"
          type="button"
          :aria-label="isWindowMaximized ? 'Restore window' : 'Maximize window'"
          @click="toggleMaximizeWindow"
        >
          <LucideIcon :name="isWindowMaximized ? 'copy' : 'square'" :size="13" />
        </button>
        <button
          class="app-topbar__window-control app-topbar__window-control--close"
          type="button"
          aria-label="Close window"
          @click="closeWindow"
        >
          <LucideIcon name="x" :size="15" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import BaseProfileDropdown from '@/shared/components/base/BaseProfileDropdown.vue'
import BaseTopbarButton from '@/shared/components/base/BaseTopbarButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useAuvexisAccountStore } from '@/shared/stores/auvexis-account.store'
import { useNotificationStore } from '@/shared/stores/notification.store'
import { useNotificationUiStore } from '@/shared/stores/notification-ui.store'
import { useProfileStore } from '@/shared/stores/profile.store'
import { useSettingsStore } from '@/shared/stores/settings.store'

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

const emit = defineEmits<{
  (e: 'toggle-sidebar'): void
  (e: 'open-home'): void
  (e: 'open-command-palette'): void
  (e: 'open-settings'): void
  (e: 'switch-profile'): void
  (e: 'logout'): void
}>()

const profileStore = useProfileStore()
const auvexisAccountStore = useAuvexisAccountStore()
const settingsStore = useSettingsStore()
const notificationStore = useNotificationStore()
const notificationUi = useNotificationUiStore()
const isWindowMaximized = ref(false)
let removeWindowStateListener: (() => void) | undefined

const activeName = computed(() => profileStore.currentProfile?.name ?? 'Profile')
const activeAvatar = computed(() => profileStore.currentProfile?.avatarEmoji ?? 'F')
const isDesktopWindow = computed(
  () => typeof window !== 'undefined' && window.fabricDesktop?.isDesktop === true,
)
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
  if (isDesktopWindow.value && window.fabricDesktop) {
    void window.fabricDesktop.getWindowState().then((state) => {
      isWindowMaximized.value = state.isMaximized
    })
    removeWindowStateListener = window.fabricDesktop.onWindowStateChange((state) => {
      isWindowMaximized.value = state.isMaximized
    })
  }
})

onUnmounted(() => {
  removeWindowStateListener?.()
})

function minimizeWindow() {
  void window.fabricDesktop?.minimize()
}

function toggleMaximizeWindow() {
  void window.fabricDesktop?.toggleMaximize()
}

function closeWindow() {
  void window.fabricDesktop?.close()
}

function handleProfileDropdownOpen() {
  if (!auvexisAccountStore.isLoading) {
    void auvexisAccountStore.loadStatus()
  }
}

function handleProfileDropdownAction(
  action: 'edit-profile' | 'settings' | 'auvexis-settings' | 'switch-profile' | 'logout',
) {
  if (action === 'edit-profile') {
    window.dispatchEvent(
      new CustomEvent('fabric:profiles:intent', {
        detail: {
          type: 'edit-profile',
          profileId: profileStore.currentProfile?.id,
        },
      }),
    )
    return
  }

  if (action === 'settings') {
    settingsStore.open()
    return
  }

  if (action === 'auvexis-settings') {
    settingsStore.openAuvexis()
    return
  }

  if (action === 'switch-profile') {
    emit('switch-profile')
    return
  }

  emit('logout')
}
</script>

<style scoped>
.app-topbar {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: var(--fabric-space-3);
  min-height: 30px;
  /* padding: 0 var(--fabric-space-4); */
  border-bottom: 1px solid var(--fabric-app-topbar-topbar-border);
  border-radius: var(--fabric-desktop-window-radius) var(--fabric-desktop-window-radius) 0 0;
  background: var(--fabric-app-topbar-topbar-bg);
  flex-shrink: 0;
  -webkit-app-region: drag;
}

:global(html.fabric-desktop-full-bleed) .app-topbar {
  border-radius: 0;
}

.app-topbar__section {
  display: flex;
  align-items: center;
  min-width: 0;
  -webkit-app-region: drag;
}

.app-topbar__section--left {
  justify-content: flex-start;
}

.app-topbar__section--center {
  justify-content: center;
  gap: var(--fabric-space-2);
  min-width: 220px;
  max-width: min(46vw, 620px);
}

.app-topbar__section--right {
  justify-content: flex-end;
}

.app-topbar__route-slot,
.app-topbar__context {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.app-topbar__portal {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  -webkit-app-region: no-drag;
}

.app-topbar__route-slot {
  max-width: min(40vw, 560px);
}

.app-topbar__context {
  gap: var(--fabric-space-2);
  color: var(--fabric-app-topbar-topbar-search-text);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-topbar__portal:not(:empty) + .app-topbar__fallback {
  display: none;
}

.app-topbar__fallback {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-topbar__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border: 1px solid var(--fabric-app-topbar-topbar-search-border);
  border-radius: var(--fabric-app-topbar-avatar-radius);
  background: var(--fabric-app-topbar-topbar-button-bg);
  color: var(--fabric-app-topbar-topbar-button-text);
  font-size: 15px;
  line-height: 1;
}

.app-topbar__profile-button {
  min-width: 0;
  max-width: 230px;
  padding: 0 var(--fabric-space-2);
}

.app-topbar__profile-name {
  max-width: 160px;
  overflow: hidden;
  color: var(--fabric-app-topbar-topbar-button-text);
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
  color: var(--fabric-app-topbar-topbar-search-text);
  line-height: 0;
}

.app-topbar__separator {
  color: var(--fabric-app-topbar-topbar-search-text);
  font-size: var(--fabric-text-sm);
}

.app-topbar__notification {
  position: relative;
  display: inline-flex;
  user-select: none;
}

.app-topbar__notification-badge {
  position: absolute;
  top: 0;
  right: calc(-1 * 2px);
  min-width: var(--fabric-space-4);
  height: var(--fabric-space-4);
  color: var(--fabric-app-topbar-topbar-notification-badge-text);
  font-size: 5px;
  font-weight: var(--fabric-font-bold);
  text-align: center;
}

.app-topbar__icon-button,
.app-topbar__action-button,
.app-topbar__command {
  flex: 0 0 auto;
}

.app-topbar__action-button {
  min-width: 40px;
  padding: 0 var(--fabric-space-2);
}

.app-topbar__action-button--icon-only {
  width: 40px;
  padding: 0;
}

.app-topbar__action-button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-topbar__command {
  min-width: 0;
}

.app-topbar__window-controls {
  display: inline-flex;
  align-items: stretch;
  align-self: stretch;
  margin-left: var(--fabric-space-1);
  -webkit-app-region: no-drag;
}

.app-topbar__window-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  min-height: 40px;
  border: 0;
  border-radius: var(--fabric-app-topbar-window-control-radius);
  background: var(--fabric-app-topbar-window-control-bg);
  color: var(--fabric-app-topbar-window-control-text);
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.app-topbar__window-control:hover {
  background: var(--fabric-app-topbar-window-control-hover-bg);
  color: var(--fabric-app-topbar-window-control-hover-text);
}

.app-topbar__window-control--close:hover {
  background: var(--fabric-app-topbar-window-control-close-hover-bg);
  color: var(--fabric-app-topbar-window-control-close-hover-text);
}

.app-topbar span {
  font-size: var(--fabric-text-sm);
}

.app-topbar :deep(button),
.app-topbar :deep(a),
.app-topbar :deep(input),
.app-topbar :deep(textarea),
.app-topbar :deep(select),
.app-topbar :deep([role='button']) {
  -webkit-app-region: no-drag;
}

@media (max-width: 1350px) {
  .app-topbar {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: var(--fabric-space-1);
    padding: 0;
  }

  .app-topbar__section--center {
    min-width: 0;
    max-width: none;
  }

  .app-topbar__profile-name,
  .app-topbar__fallback,
  .app-topbar__command :deep(.base-topbar-button__center) {
    display: none;
  }

  .app-topbar__route-slot {
    max-width: 40px;
  }

  .app-topbar__route-slot :deep(.topbar-route-menu-bar) {
    display: none;
  }

  .app-topbar__route-slot :deep(.base-topbar-overflow-menu) {
    display: inline-flex;
  }

  .app-topbar__section--right {
    min-width: max-content;
  }

  .app-topbar__command {
    width: 40px;
    padding: 0;
  }
}

@media (max-width: 560px) {
  .app-topbar__section--left .app-topbar__icon-button + .app-topbar__icon-button {
    display: none;
  }

  .app-topbar__window-control {
    width: 38px;
  }
}
</style>
