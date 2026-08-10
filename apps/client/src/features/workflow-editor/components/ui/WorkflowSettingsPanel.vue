<script setup lang="ts">
import { computed } from 'vue'
import AppPanel from '@/shared/components/layout/AppPanel.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import { useWorkflowStore } from '../../stores/workflow.store'
import { useWorkflowActions } from '../../composables/useWorkflowActions'
import { useConfirm } from '@/shared/composables/useConfirm'
import type { WorkflowItem } from '@/core/types/workflow.types'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'resize', size: { width: number | null; height: number | null }): void
  (e: 'resizeReset'): void
}>()

const workflowStore = useWorkflowStore()
const { deleteActiveWorkflow } = useWorkflowActions()
const { confirm } = useConfirm()

const workflowId = computed(() => workflowStore.activeWorkflow?.metadata.id ?? '-')
const createdAt = computed(() => {
  const raw = workflowStore.activeWorkflow?.metadata.createdAt
  if (!raw) return '-'
  return new Date(raw).toLocaleString()
})
const updatedAt = computed(() => {
  const raw = workflowStore.activeWorkflow?.metadata.updatedAt
  if (!raw) return '-'
  return new Date(raw).toLocaleString()
})
const version = computed(() => workflowStore.activeWorkflow?.metadata.version ?? '-')

function updateMetadata(patch: Partial<WorkflowItem['metadata']>) {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return
  workflow.metadata = {
    ...workflow.metadata,
    ...patch,
  }
}

const workflowName = computed({
  get: () => workflowStore.activeWorkflow?.metadata.name ?? '',
  set: (name: string) => updateMetadata({ name }),
})
const workflowDescription = computed({
  get: () => workflowStore.activeWorkflow?.metadata.description ?? '',
  set: (description: string) => updateMetadata({ description }),
})
const workflowActive = computed({
  get: () => workflowStore.activeWorkflow?.metadata.isActive ?? false,
  set: (isActive: boolean) => updateMetadata({ isActive }),
})
const workflowDraft = computed({
  get: () => workflowStore.activeWorkflow?.metadata.isDraft ?? true,
  set: (isDraft: boolean) => updateMetadata({ isDraft }),
})
const workflowPublic = computed({
  get: () => workflowStore.activeWorkflow?.metadata.public ?? false,
  set: (isPublic: boolean) => updateMetadata({ public: isPublic }),
})

async function handleDeleteClick() {
  const ok = await confirm({
    title: 'Delete Workflow',
    message: `Are you sure you want to permanently delete "${workflowName.value || 'this workflow'}"? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger',
  })

  if (ok) {
    await deleteActiveWorkflow()
    emit('close')
  }
}
</script>

<template>
  <AppPanel
    :is-open="isOpen"
    panel-id="workflow-settings-panel"
    title="Workflow Settings"
    resizable
    resize-side="left"
    @close="$emit('close')"
    @resize="emit('resize', $event)"
    @resize-reset="emit('resizeReset')"
  >
    <div class="wsp-body">
      <section class="wsp-section">
        <h4 class="wsp-section__title">General</h4>

        <div class="wsp-fields">
          <BaseInput v-model="workflowName" label="Name" placeholder="My Workflow" required />

          <BaseTextarea
            v-model="workflowDescription"
            label="Description"
            placeholder="What does this workflow do?"
            :rows="3"
          />
        </div>
      </section>

      <section class="wsp-section">
        <h4 class="wsp-section__title">Status</h4>

        <div class="wsp-fields">
          <div class="wsp-switch-row">
            <div class="wsp-switch-row__info">
              <span class="wsp-switch-row__label">Active</span>
              <span class="wsp-switch-row__hint">Allow this workflow to be triggered</span>
            </div>
            <BaseSwitch v-model="workflowActive" />
          </div>

          <div class="wsp-switch-row">
            <div class="wsp-switch-row__info">
              <span class="wsp-switch-row__label">Draft</span>
              <span class="wsp-switch-row__hint">Mark as draft (not published to production)</span>
            </div>
            <BaseSwitch v-model="workflowDraft" />
          </div>

          <div class="wsp-switch-row">
            <div class="wsp-switch-row__info">
              <span class="wsp-switch-row__label">Public</span>
              <span class="wsp-switch-row__hint">Expose this workflow via public API</span>
            </div>
            <BaseSwitch v-model="workflowPublic" />
          </div>
        </div>
      </section>

      <section class="wsp-section">
        <h4 class="wsp-section__title">Details</h4>

        <div class="wsp-info-grid">
          <div class="wsp-info-item">
            <span class="wsp-info-item__key">ID</span>
            <span class="wsp-info-item__value wsp-info-item__value--mono">{{ workflowId }}</span>
          </div>
          <div class="wsp-info-item">
            <span class="wsp-info-item__key">Version</span>
            <span class="wsp-info-item__value">{{ version }}</span>
          </div>
          <div class="wsp-info-item">
            <span class="wsp-info-item__key">Created</span>
            <span class="wsp-info-item__value">{{ createdAt }}</span>
          </div>
          <div class="wsp-info-item">
            <span class="wsp-info-item__key">Last saved</span>
            <span class="wsp-info-item__value">{{ updatedAt }}</span>
          </div>
        </div>
      </section>

      <section class="wsp-section wsp-section--danger">
        <h4 class="wsp-section__title wsp-section__title--danger">Danger Zone</h4>

        <div class="wsp-danger-row">
          <div class="wsp-danger-row__info">
            <span class="wsp-danger-row__label">Delete Workflow</span>
            <span class="wsp-danger-row__hint">
              Permanently remove this workflow and all its execution history. This cannot be
              undone.
            </span>
          </div>
          <BaseButton size="sm" variant="danger" icon-left="trash-2" @click="handleDeleteClick">
            Delete
          </BaseButton>
        </div>
      </section>
    </div>
  </AppPanel>
</template>
