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
    deleteActiveWorkflow()
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
        variant="primary"
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

<style scoped>
/* ── Body ────────────────────────────────────────────────────────────────── */

.wsp-body {
  display: flex;
  flex-direction: column;
  padding: var(--nod8-space-4);
  gap: var(--nod8-space-6);
}

/* ── Section ─────────────────────────────────────────────────────────────── */

.wsp-section {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-3);
}

.wsp-section--danger {
  padding: var(--nod8-space-4);
  border-radius: var(--nod8-radius-sm);
  border: 1px solid rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.04);
}

.wsp-section__title {
  margin: 0;
  font-size: var(--nod8-text-xs);
  font-weight: var(--nod8-font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--nod8-text-muted);
}

.wsp-section__title--danger {
  color: rgba(239, 68, 68, 0.8);
}

/* ── Fields stack ────────────────────────────────────────────────────────── */

.wsp-fields {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-3);
}

/* ── Switch row ──────────────────────────────────────────────────────────── */

.wsp-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-2) 0;
  border-bottom: 1px solid var(--nod8-border);
}

.wsp-switch-row:last-child {
  border-bottom: none;
}

.wsp-switch-row__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wsp-switch-row__label {
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-medium);
  color: var(--nod8-text-primary);
}

.wsp-switch-row__hint {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
}

/* ── Info grid ───────────────────────────────────────────────────────────── */

.wsp-info-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-border);
  overflow: hidden;
}

.wsp-info-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-2) var(--nod8-space-3);
  border-bottom: 1px solid var(--nod8-border);
  background: var(--nod8-bg-overlay);
}

.wsp-info-item:last-child {
  border-bottom: none;
}

.wsp-info-item__key {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  flex-shrink: 0;
}

.wsp-info-item__value {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-secondary);
  text-align: right;
  word-break: break-all;
}

.wsp-info-item__value--mono {
  font-family: var(--nod8-font-mono);
  font-size: 10px;
  letter-spacing: -0.01em;
}

/* ── Danger row ──────────────────────────────────────────────────────────── */

.wsp-danger-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nod8-space-4);
}

.wsp-danger-row__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.wsp-danger-row__label {
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-medium);
  color: var(--nod8-text-primary);
}

.wsp-danger-row__hint {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  line-height: 1.4;
  max-width: 220px;
}
</style>
