<template>
  <BaseModal :is-open="isOpen" max-width="560px" @close="$emit('close')">
    <div class="base-update-dialog">
      <div class="base-update-dialog__header">
        <div>
          <h3>{{ update?.title || 'Fabric Update' }}</h3>
          <p v-if="update">
            {{ update.currentVersion }} -> {{ update.version }}
          </p>
        </div>
        <BaseButton variant="ghost" size="icon" title="Close" @click="$emit('close')">
          <template #left>
            <LucideIcon name="x" :size="16" />
          </template>
        </BaseButton>
      </div>

      <div class="base-update-dialog__body">
        <p v-if="update?.publishedAt" class="base-update-dialog__meta">
          Published {{ new Date(update.publishedAt).toLocaleString() }}
        </p>
        <pre>{{ update?.notes || 'No changelog provided.' }}</pre>
      </div>

      <div class="base-update-dialog__footer">
        <BaseButton variant="secondary" @click="$emit('close')">Later</BaseButton>
        <BaseButton variant="primary" :disabled="!update?.url" @click="openRelease">
          <template #left>
            <LucideIcon name="download" :size="15" />
          </template>
          Download Update
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

export interface BaseUpdateDialogInfo {
  currentVersion: string
  updateAvailable: boolean
  channel: 'safe' | 'stable' | 'beta' | 'alpha'
  version: string | null
  title: string | null
  notes: string | null
  url: string | null
  publishedAt: string | null
}

const props = defineProps<{
  isOpen: boolean
  update: BaseUpdateDialogInfo | null
}>()

defineEmits<{ close: [] }>()

function openRelease() {
  if (!props.update?.url) return
  void window.fabricDesktop?.openExternal(props.update.url)
}
</script>

<style scoped>
.base-update-dialog {
  display: flex;
  flex-direction: column;
  max-height: min(620px, 78vh);
  background: var(--fabric-base-modal-bg);
  color: var(--fabric-base-modal-text);
}

.base-update-dialog__header,
.base-update-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-4);
  border-bottom: 1px solid var(--fabric-base-modal-border);
}

.base-update-dialog__footer {
  border-top: 1px solid var(--fabric-base-modal-border);
  border-bottom: 0;
}

.base-update-dialog h3,
.base-update-dialog p {
  margin: 0;
}

.base-update-dialog h3 {
  font-size: var(--fabric-text-lg);
  font-weight: var(--fabric-font-semibold);
}

.base-update-dialog p {
  margin-top: var(--fabric-space-1);
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-sm);
}

.base-update-dialog__body {
  overflow: auto;
  padding: var(--fabric-space-4);
}

.base-update-dialog__meta {
  margin-bottom: var(--fabric-space-3);
}

.base-update-dialog pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--fabric-font-sans);
  font-size: var(--fabric-text-sm);
  line-height: 1.55;
}
</style>
