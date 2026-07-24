<template>
  <Transition name="notification-panel-top">
    <div
      v-if="notificationUi.isOpen"
      class="notification-panel notification-panel--top-centered"
      @keydown.esc="closePanel"
    >
      <div class="notification-panel__backdrop" aria-hidden="true" @click="closePanel" />
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
              <div class="notification-panel__action-buttons">
                <BaseButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon-left="check-check"
                  @click="notificationStore.markAllRead()"
                >
                  Mark all read
                </BaseButton>
                <BaseButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon-left="trash-2"
                  @click="confirmClearAll"
                >
                  Clear all
                </BaseButton>
              </div>
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
  }
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
  inset: 0;
  z-index: var(--fabric-z-modal);
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.notification-panel__backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: transparent;
  pointer-events: auto;
}

.notification-panel--top-centered {
  align-items: flex-start;
}

.notification-panel__shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--fabric-space-4);
  width: min(var(--fabric-global-notification-panel-panel-width-wide), calc(100vw - var(--fabric-space-8)));
  min-height: min(420px, calc(100vh - var(--fabric-space-4)));
  max-height: calc(100vh - var(--fabric-space-4));
  overflow: visible;
  padding: var(--fabric-space-4);
  border: 1px solid var(--fabric-global-notification-panel-border);
  border-top: 0;
  border-radius: var(--fabric-notification-panel-header-radius);
  background: var(--fabric-global-notification-panel-bg-surface);
  box-shadow: var(--fabric-global-notification-panel-shadow-xl);
  color: var(--fabric-global-notification-panel-text-primary);
  pointer-events: auto;
  outline: none;
  z-index: 1;
}

.notification-panel__header,
.notification-panel__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-3);
}

.notification-panel__header h2,
.notification-panel__header p {
  margin: 0;
}

.notification-panel__header h2 {
  font-size: var(--fabric-text-lg);
}

.notification-panel__header p {
  color: var(--fabric-global-notification-panel-text-secondary);
  font-size: var(--fabric-text-sm);
}

.notification-panel__body {
  position: relative;
  min-height: 0;
  max-height: calc(100vh - var(--fabric-space-16);
  overflow: visible;
}

.notification-panel__list-view {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: var(--fabric-space-4);
  min-height: 0;
}

.notification-panel__body--detail .notification-panel__list-view {
  pointer-events: none;
}

.notification-panel__detail-view {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: auto;
  min-height: 100%;
  background: var(--fabric-global-notification-panel-bg-surface);
}

.notification-panel__tabs-carousel {
  position: relative;
  overflow: hidden;
  padding: var(--fabric-space-1);
  border: 1px solid var(--fabric-global-notification-panel-border);
  border-radius: var(--fabric-notification-panel-action-radius);
  background: var(--fabric-global-notification-panel-bg-base);
}

.notification-panel__tabs-carousel::before,
.notification-panel__tabs-carousel::after {
  position: absolute;
  top: var(--fabric-space-1);
  bottom: var(--fabric-space-1);
  z-index: 1;
  width: var(--fabric-space-6);
  pointer-events: none;
  content: '';
}

.notification-panel__tabs-track {
  display: flex;
  gap: var(--fabric-space-2);
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
}

.notification-panel__tabs-track {
  scroll-behavior: smooth;
}

.notification-panel__tabs-track::-webkit-scrollbar {
  display: none;
}

.notification-panel__tab {
  flex: 0 0 auto;
  padding: var(--fabric-space-2) var(--fabric-space-3);
  border: 1px solid var(--fabric-global-notification-panel-border);
  border-radius: var(--fabric-notification-panel-item-radius);
  background: var(--fabric-global-notification-panel-bg-surface);
  color: var(--fabric-global-notification-panel-text-secondary);
  font: inherit;
  font-size: var(--fabric-text-sm);
  cursor: pointer;
  scroll-snap-align: start;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.notification-panel__tab:hover,
.notification-panel__tab--active {
  border-color: var(--fabric-global-notification-panel-border-strong);
  color: var(--fabric-global-notification-panel-text-primary);
  background: var(--fabric-global-notification-panel-bg-overlay);
}

.notification-panel__controls {
  position: relative;
  z-index: 2;
  justify-content: space-between;
}

.notification-panel__action-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--fabric-space-2);
}

.notification-panel__controls :deep(.notification-panel__controls-menu) {
  z-index: calc(var(--fabric-z-modal) + 1);
  width: 260px;
}
</style>
