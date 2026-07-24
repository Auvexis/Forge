<template>
  <article v-if="notification" class="notification-detail" aria-label="Notification detail">
    <header class="notification-detail__header">
      <BaseButton type="button" variant="ghost" size="sm" iconLeft="arrow-left" @click="notificationUi.backToList()">
        Back
      </BaseButton>
      <BaseButton
        type="button"
        variant="danger"
        size="icon"
        iconLeft="trash-2"
        aria-label="Delete notification"
        @click="deleteNotification"
      />
    </header>

    <div class="notification-detail__body">
      <span class="notification-detail__level">{{ notification.level }}</span>
      <h2>{{ notification.title ?? notification.message }}</h2>
      <p v-if="notification.title">{{ notification.message }}</p>

      <dl class="notification-detail__meta">
        <div>
          <dt>Category</dt>
          <dd>{{ notification.category }}</dd>
        </div>
        <div v-if="notification.source">
          <dt>Source</dt>
          <dd>{{ notification.source }}</dd>
        </div>
        <div>
          <dt>First seen</dt>
          <dd>{{ formatDate(notification.createdAt) }}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{{ formatDate(notification.lastOccurredAt) }}</dd>
        </div>
        <div>
          <dt>Occurrences</dt>
          <dd>{{ notification.occurrenceCount }}</dd>
        </div>
      </dl>

      <pre v-if="notification.context" class="notification-detail__context">{{ contextText }}</pre>
    </div>

    <footer v-if="notification.actionUrl && notification.actionLabel" class="notification-detail__footer">
      <BaseButton type="button" variant="primary" iconRight="arrow-right" @click="runAction">
        {{ notification.actionLabel }}
      </BaseButton>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { useNotificationStore } from '@/shared/stores/notification.store'
import { useNotificationUiStore } from '@/shared/stores/notification-ui.store'

const notificationStore = useNotificationStore()
const notificationUi = useNotificationUiStore()
const router = useRouter()

const notification = computed(() =>
  notificationStore.notifications.find((item) => item.id === notificationUi.detailNotificationId),
)
const contextText = computed(() => JSON.stringify(notification.value?.context, null, 2))

watch(
  () => notificationUi.detailNotificationId,
  (detailNotificationId) => {
    if (detailNotificationId) void notificationStore.markRead(detailNotificationId)
  },
  { immediate: true },
)

async function deleteNotification() {
  if (!notification.value) return
  const deleted = await notificationStore.deleteOne(notification.value.id)
  if (deleted) notificationUi.backToList()
}

async function runAction() {
  if (!notification.value?.actionUrl) return
  const target = notification.value.actionUrl
  notificationUi.close()
  await router.push(target)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}
</script>

<style scoped>
.notification-detail {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: var(--fabric-space-3);
  height: 100%;
  min-height: 0;
}

.notification-detail__header,
.notification-detail__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-2);
}

.notification-detail__body {
  display: grid;
  align-content: start;
  gap: var(--fabric-space-2);
  min-height: 0;
  overflow-y: auto;
}

.notification-detail__level {
  width: max-content;
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
  text-transform: uppercase;
}

.notification-detail h2,
.notification-detail p,
.notification-detail__meta {
  margin: 0;
}

.notification-detail h2 {
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-lg);
  line-height: var(--fabric-leading-tight);
}

.notification-detail p,
.notification-detail dd {
  color: var(--fabric-text-secondary);
}

.notification-detail__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--fabric-space-2);
}

.notification-detail__meta div {
  min-width: 0;
}

.notification-detail dt {
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.notification-detail dd {
  margin: var(--fabric-space-1) 0 0;
  overflow-wrap: anywhere;
}

.notification-detail__context {
  max-height: 220px;
  overflow: auto;
  padding: var(--fabric-space-3);
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-notification-detail-preview-radius);
  background: var(--fabric-bg-base);
  color: var(--fabric-text-secondary);
  font-family: var(--fabric-font-mono);
  font-size: var(--fabric-text-xs);
}
</style>
