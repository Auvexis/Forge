<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import AppPanel from '@/shared/components/layout/AppPanel.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useWorkflowStore } from '../../stores/workflow.store'
import { useWorkflowActions } from '../../composables/useWorkflowActions'
import { useConfirm } from '@/shared/composables/useConfirm'

// ── Props / Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// ── Store ────────────────────────────────────────────────────────────────────

const workflowStore = useWorkflowStore()
const { deleteActiveWorkflow } = useWorkflowActions()
const { confirm } = useConfirm()

// ── Local draft (copy of metadata to edit) ───────────────────────────────────

const draft = ref({
  name: '',
  description: '',
  isActive: false,
  isDraft: false,
  public: false,
})

// Sync draft whenever the panel opens or the active workflow changes
watch(
  [() => props.isOpen, () => workflowStore.activeWorkflow],
  ([open]) => {
    if (!open) return
    const meta = workflowStore.activeWorkflow?.metadata
    if (!meta) return
    draft.value = {
      name: meta.name ?? '',
      description: meta.description ?? '',
      isActive: meta.isActive ?? false,
      isDraft: meta.isDraft ?? true,
      public: meta.public ?? false,
    }
  },
  { immediate: true },
)

// ── Read-only info ────────────────────────────────────────────────────────────

const workflowId = computed(() => workflowStore.activeWorkflow?.metadata.id ?? '—')
const createdAt = computed(() => {
  const raw = workflowStore.activeWorkflow?.metadata.createdAt
  if (!raw) return '—'
  return new Date(raw).toLocaleString()
})
const updatedAt = computed(() => {
  const raw = workflowStore.activeWorkflow?.metadata.updatedAt
  if (!raw) return '—'
  return new Date(raw).toLocaleString()
})
const version = computed(() => workflowStore.activeWorkflow?.metadata.version ?? '—')

// ── Saving ────────────────────────────────────────────────────────────────────

const isSaving = computed(() => workflowStore.isSaving)

function handleSave() {
  if (!workflowStore.activeWorkflow) return

  workflowStore.activeWorkflow.metadata = {
    ...workflowStore.activeWorkflow.metadata,
    ...draft.value,
  }

  workflowStore.markDirty()
  workflowStore.saveActiveWorkflow()
}

// ── Delete confirmation ───────────────────────────────────────────────────────

async function handleDeleteClick() {
  const ok = await confirm({
    title: 'Delete Workflow',
    message: `Are you sure you want to permanently delete "${draft.value.name}"? This action cannot be undone.`,
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
  <!-- Main settings panel -->
  <AppPanel :is-open="isOpen" title="Workflow Settings" @close="$emit('close')">
    <!-- ── Header action slot: Save button ──────────────────────────────── -->
    <template #actions>
      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="save"
        :loading="isSaving"
        @click="handleSave"
      >
        Save
      </BaseButton>
    </template>

    <!-- ── Body ──────────────────────────────────────────────────────────── -->
    <div class="wsp-body">
      <!-- Section: General -->
      <section class="wsp-section">
        <h4 class="wsp-section__title">General</h4>

        <div class="wsp-fields">
          <BaseInput v-model="draft.name" label="Name" placeholder="My Workflow" required />

          <BaseTextarea
            v-model="draft.description"
            label="Description"
            placeholder="What does this workflow do?"
            :rows="3"
          />
        </div>
      </section>

      <!-- Section: Status -->
      <section class="wsp-section">
        <h4 class="wsp-section__title">Status</h4>

        <div class="wsp-fields">
          <div class="wsp-switch-row">
            <div class="wsp-switch-row__info">
              <span class="wsp-switch-row__label">Active</span>
              <span class="wsp-switch-row__hint">Allow this workflow to be triggered</span>
            </div>
            <BaseSwitch v-model="draft.isActive" />
          </div>

          <div class="wsp-switch-row">
            <div class="wsp-switch-row__info">
              <span class="wsp-switch-row__label">Draft</span>
              <span class="wsp-switch-row__hint">Mark as draft (not published to production)</span>
            </div>
            <BaseSwitch v-model="draft.isDraft" />
          </div>

          <div class="wsp-switch-row">
            <div class="wsp-switch-row__info">
              <span class="wsp-switch-row__label">Public</span>
              <span class="wsp-switch-row__hint">Expose this workflow via public API</span>
            </div>
            <BaseSwitch v-model="draft.public" />
          </div>
        </div>
      </section>

      <!-- Section: Info (read-only) -->
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

      <!-- Section: Danger zone -->
      <section class="wsp-section wsp-section--danger">
        <h4 class="wsp-section__title wsp-section__title--danger">Danger Zone</h4>

        <div class="wsp-danger-row">
          <div class="wsp-danger-row__info">
            <span class="wsp-danger-row__label">Delete Workflow</span>
            <span class="wsp-danger-row__hint"
              >Permanently remove this workflow and all its execution history. This cannot be
              undone.</span
            >
          </div>
          <BaseButton size="sm" variant="danger" icon-left="trash-2" @click="handleDeleteClick">
            Delete
          </BaseButton>
        </div>
      </section>
    </div>
  </AppPanel>
</template>
