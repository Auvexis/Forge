<template>
  <Transition name="notification-panel-top">
    <div
      v-if="notificationUi.isOpen"
      class="notification-panel notification-panel--top-centered"
      @keydown.esc="closePanel"
    >
      <section
        id="global-notification-panel"
        ref="panelRef"
        class="notification-panel__shell"
        role="dialog"
        aria-modal="false"
        aria-labelledby="global-notification-panel-title"
        tabindex="-1"
      >
        <header class="notification-panel__header">
          <div>
            <h2 id="global-notification-panel-title">Notifications</h2>
            <p>{{ notificationStore.unreadCount }} unread</p>
          </div>
          <BaseButton type="button" variant="ghost" size="icon" iconLeft="x" aria-label="Close notifications" @click="closePanel" />
        </header>

        <div
          class="notification-panel__body"
          :class="{ 'notification-panel__body--detail': notificationUi.detailNotificationId }"
        >
          <div class="notification-panel__list-view">
            <div class="notification-panel__tabs-carousel">
              <nav class="notification-panel__tabs-track" aria-label="Notification categories">
                <button
                  v-for="tab in categoryTabs"
                  :key="tab.id"
                  type="button"
                  class="notification-panel__tab"
                  :class="{ 'notification-panel__tab--active': notificationStore.selectedCategory === tab.id }"
                  @click="notificationStore.setCategory(tab.id)"
                >
                  {{ tab.label }}
                </button>
              </nav>
            </div>

            <div v-if="hasNotifications" class="notification-panel__controls">
              <BaseDropdownSelect
                :model-value="actionMenuValue"
                :options="actionOptions"
                variant="ghost"
                size="sm"
                icon-left="sliders-horizontal"
                direction="down"
                menu-class="notification-panel__controls-menu"
                title="Manage notifications"
                @update:model-value="handleActionSelect"
              />
            </div>

            <NotificationList @select="selectDetail" />
          </div>

          <Transition name="notification-detail-slide">
            <NotificationDetail
              v-if="notificationUi.detailNotificationId"
              class="notification-panel__detail-view"
            />
          </Transition>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseDropdownSelect, {
  type BaseDropdownSelectOption,
} from '@/shared/components/base/BaseDropdownSelect.vue'
import NotificationDetail from '@/shared/components/feedback/NotificationDetail.vue'
import NotificationList from '@/shared/components/feedback/NotificationList.vue'
import { useConfirm } from '@/shared/composables/useConfirm'
import { useNotificationStore } from '@/shared/stores/notification.store'
import { useNotificationUiStore } from '@/shared/stores/notification-ui.store'
import type { NotificationLevel } from '@/core/types/notification.types'

const notificationStore = useNotificationStore()
const notificationUi = useNotificationUiStore()
const { confirm } = useConfirm()
const panelRef = ref<HTMLElement | null>(null)
const focusOrigin = ref<HTMLElement | null>(null)
const actionMenuValue = ref('filter:all')

const categoryTabs = computed(() => [
  { id: 'all', label: 'Global' },
  ...notificationStore.categories
    .filter((category) => category !== 'global')
    .map((category) => ({
      id: category,
      label: labelFromIdentifier(category),
    })),
])
const levelFilters: Array<{ id: 'all' | NotificationLevel; label: string }> = [
  { id: 'all', label: 'All levels' },
  { id: 'error', label: 'Errors' },
  { id: 'warning', label: 'Warnings' },
  { id: 'info', label: 'Info' },
]
const hasNotifications = computed(() => notificationStore.notifications.length > 0)
const actionOptions = computed<BaseDropdownSelectOption[]>(() => [
  ...levelFilters.map((level) => ({
    value: `filter:${level.id}`,
    label: level.label,
    description: 'Filter visible notifications',
    meta: notificationStore.selectedLevel === level.id ? 'On' : 'Filter',
  })),
  {
    value: 'action:mark-all-read',
    label: 'Mark all read',
    description: 'Clear unread state for every notification',
    meta: 'Action',
  },
  {
    value: 'action:clear-all',
    label: 'Clear all',
    description: 'Delete every notification after confirmation',
    meta: 'Danger',
  },
])

watch(
  () => notificationUi.isOpen,
  async (isOpen) => {
    if (isOpen) {
      focusOrigin.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await notificationStore.load()
      await nextTick()
      panelRef.value?.focus()
      return
    }
    await nextTick()
    focusOrigin.value?.focus()
    focusOrigin.value = null
  },
)

function closePanel() {
  notificationUi.close()
}

function selectDetail(notificationId: string) {
  notificationUi.showDetail(notificationId)
}

async function confirmClearAll() {
  const accepted = await confirm({
    title: 'Clear notifications?',
    message: 'This removes every notification for the active profile.',
    confirmText: 'Clear all',
    cancelText: 'Cancel',
  })
  if (accepted) await notificationStore.clear()
}

async function handleActionSelect(value: string) {
  if (value.startsWith('filter:')) {
    const level = value.slice('filter:'.length) as 'all' | NotificationLevel
    notificationStore.setLevel(level)
    actionMenuValue.value = value
    return
  }
  actionMenuValue.value = `filter:${notificationStore.selectedLevel}`
  if (value === 'action:mark-all-read') {
    await notificationStore.markAllRead()
    return
  }
  if (value === 'action:clear-all') await confirmClearAll()
}

function labelFromIdentifier(identifier: string) {
  return identifier
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
</script>

<style scoped>
.notification-panel {
  position: fixed;
  inset: 0 0 auto;
  z-index: var(--sailor-z-modal);
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.notification-panel--top-centered {
  align-items: flex-start;
}

.notification-panel__shell {
  display: grid;
  gap: var(--sailor-space-4);
  width: min(var(--sailor-panel-width-wide), calc(100vw - var(--sailor-space-8)));
  max-height: calc(100vh - var(--sailor-space-4));
  overflow: visible;
  padding: var(--sailor-space-4);
  border: 1px solid var(--sailor-border);
  border-top: 0;
  border-radius: 0 0 var(--sailor-radius-sm) var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  box-shadow: var(--sailor-shadow-xl);
  color: var(--sailor-text-primary);
  pointer-events: auto;
  outline: none;
}

.notification-panel__header,
.notification-panel__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-3);
}

.notification-panel__header h2,
.notification-panel__header p {
  margin: 0;
}

.notification-panel__header h2 {
  font-size: var(--sailor-text-lg);
}

.notification-panel__header p {
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
}

.notification-panel__body {
  position: relative;
  min-height: 0;
  overflow: visible;
}

.notification-panel__list-view {
  display: grid;
  gap: var(--sailor-space-4);
  min-height: 0;
}

.notification-panel__body--detail .notification-panel__list-view {
  pointer-events: none;
}

.notification-panel__detail-view {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: auto;
  min-height: 100%;
  max-height: calc(100vh - var(--sailor-space-12) - var(--sailor-space-8));
  padding: var(--sailor-space-4);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  box-shadow: var(--sailor-shadow-lg);
}

.notification-panel__tabs-carousel {
  position: relative;
  overflow: hidden;
  padding: var(--sailor-space-1);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-base);
}

.notification-panel__tabs-carousel::before,
.notification-panel__tabs-carousel::after {
  position: absolute;
  top: var(--sailor-space-1);
  bottom: var(--sailor-space-1);
  z-index: 1;
  width: var(--sailor-space-6);
  pointer-events: none;
  content: '';
}

.notification-panel__tabs-carousel::before {
  left: var(--sailor-space-1);
  background: linear-gradient(to right, var(--sailor-bg-base), transparent);
}

.notification-panel__tabs-carousel::after {
  right: var(--sailor-space-1);
  background: linear-gradient(to left, var(--sailor-bg-base), transparent);
}

.notification-panel__tabs-track {
  display: flex;
  gap: var(--sailor-space-2);
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
}

.notification-panel__tabs-track {
  padding: 0 var(--sailor-space-5);
  scroll-behavior: smooth;
}

.notification-panel__tabs-track::-webkit-scrollbar {
  display: none;
}

.notification-panel__tab {
  flex: 0 0 auto;
  padding: var(--sailor-space-2) var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-secondary);
  font: inherit;
  font-size: var(--sailor-text-sm);
  cursor: pointer;
  scroll-snap-align: start;
  transition:
    background-color var(--sailor-duration-fast) var(--sailor-ease-standard),
    border-color var(--sailor-duration-fast) var(--sailor-ease-standard),
    color var(--sailor-duration-fast) var(--sailor-ease-standard);
}

.notification-panel__tab:hover,
.notification-panel__tab--active {
  border-color: var(--sailor-border-strong);
  color: var(--sailor-text-primary);
  background: var(--sailor-bg-overlay);
}

.notification-panel__controls {
  justify-content: flex-end;
}

.notification-panel__controls :deep(.notification-panel__controls-menu) {
  z-index: calc(var(--sailor-z-modal) + 1);
  width: 260px;
}
</style>
