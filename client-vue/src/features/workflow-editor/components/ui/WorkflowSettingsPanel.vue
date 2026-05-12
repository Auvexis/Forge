<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import AppPanel from '@/shared/components/layout/AppPanel.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useWorkflowStore } from '../../stores/workflow.store'
import { useWorkflowActions } from '../../composables/useWorkflowActions'
import { useConfirm } from '@/shared/composables/useConfirm'
import type { WorkflowVariable } from '@/core/types/workflow.types'

// ── Props / Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// ── Store ────────────────────────────────────────────────────────────────────

const workflowStore = useWorkflowStore()
const { deleteActiveWorkflow, saveWorkflow } = useWorkflowActions()
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
const variableSearch = ref('')
const revealedSecrets = ref<Record<string, boolean>>({})
const variableDraft = ref<WorkflowVariable>({
  name: '',
  type: 'string',
  defaultValue: '',
  description: '',
})
const variableTypeOptions = [
  { value: 'string', label: 'String', icon: 'type' },
  { value: 'number', label: 'Number', icon: 'hash' },
  { value: 'boolean', label: 'Boolean', icon: 'toggle-left' },
  { value: 'object', label: 'Object', icon: 'braces' },
  { value: 'array', label: 'Array', icon: 'list' },
  { value: 'secret', label: 'Secret', icon: 'key-round' },
]

const filteredVariables = computed(() => {
  const variables = workflowStore.activeWorkflow?.variables ?? []
  const q = variableSearch.value.trim().toLowerCase()
  if (!q) return variables
  return variables.filter((variable) =>
    [variable.name, variable.type, variable.description ?? ''].some((value) =>
      String(value).toLowerCase().includes(q),
    ),
  )
})
const variableDefaultValue = computed({
  get: () => String(variableDraft.value.defaultValue ?? ''),
  set: (value: string) => {
    variableDraft.value.defaultValue = value
  },
})

// ── Saving ────────────────────────────────────────────────────────────────────

const isSaving = computed(() => workflowStore.isSaving)

async function handleSave() {
  if (!workflowStore.activeWorkflow) return

  workflowStore.activeWorkflow.metadata = {
    ...workflowStore.activeWorkflow.metadata,
    ...draft.value,
  }

  await saveWorkflow()
}

function normalizeDefaultValue(variable: WorkflowVariable): unknown {
  if (variable.type === 'number') return Number(variable.defaultValue ?? 0)
  if (variable.type === 'boolean') {
    return variable.defaultValue === true || variable.defaultValue === 'true'
  }
  if (variable.type === 'object' || variable.type === 'array') {
    if (typeof variable.defaultValue !== 'string') return variable.defaultValue
    try {
      return JSON.parse(variable.defaultValue)
    } catch {
      return variable.type === 'array' ? [] : {}
    }
  }
  return variable.defaultValue ?? ''
}

function addVariable() {
  if (!workflowStore.activeWorkflow) return
  const name = variableDraft.value.name.trim()
  if (!name) return

  const nextVariable: WorkflowVariable = {
    ...variableDraft.value,
    name,
    defaultValue: normalizeDefaultValue(variableDraft.value),
  }
  const variables = workflowStore.activeWorkflow.variables ?? []
  const existingIndex = variables.findIndex((variable) => variable.name === name)
  if (existingIndex >= 0) {
    variables[existingIndex] = nextVariable
  } else {
    variables.push(nextVariable)
  }
  workflowStore.activeWorkflow.variables = [...variables]
  variableDraft.value = { name: '', type: 'string', defaultValue: '', description: '' }
}

function removeVariable(name: string) {
  if (!workflowStore.activeWorkflow) return
  workflowStore.activeWorkflow.variables = (workflowStore.activeWorkflow.variables ?? []).filter(
    (variable) => variable.name !== name,
  )
}

function previewVariable(variable: WorkflowVariable): string {
  if (variable.type === 'secret' && !revealedSecrets.value[variable.name]) return '••••••••••••'
  if (variable.defaultValue === undefined || variable.defaultValue === '') return 'empty'
  if (typeof variable.defaultValue === 'object') return JSON.stringify(variable.defaultValue)
  return String(variable.defaultValue)
}

function onVariableDragStart(event: DragEvent, variable: WorkflowVariable) {
  event.dataTransfer?.setData('text/plain', `{{ variables.${variable.name} }}`)
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

      <!-- Section: Variables -->
      <section class="wsp-section">
        <div class="wsp-section-head">
          <h4 class="wsp-section__title">Variables</h4>
          <BaseInput v-model="variableSearch" icon-left="search" placeholder="Search variables" />
        </div>

        <div class="wsp-variable-form">
          <BaseInput v-model="variableDraft.name" placeholder="name" />
          <BaseSelect
            v-model="variableDraft.type"
            :options="variableTypeOptions"
            placeholder="Type"
          />
          <BaseInput
            v-model="variableDefaultValue"
            :type="variableDraft.type === 'secret' ? 'password' : 'text'"
            placeholder="Default value"
          />
          <BaseInput v-model="variableDraft.description" placeholder="Description" />
          <BaseButton size="sm" variant="primary" icon-left="plus" @click="addVariable">
            Add
          </BaseButton>
        </div>

        <div v-if="filteredVariables.length" class="wsp-variable-list">
          <div
            v-for="variable in filteredVariables"
            :key="variable.name"
            class="wsp-variable-row"
            draggable="true"
            @dragstart="onVariableDragStart($event, variable)"
          >
            <div class="wsp-variable-main">
              <LucideIcon :name="variable.type === 'secret' ? 'key-round' : 'tag'" :size="14" />
              <div>
                <span class="wsp-variable-name">{{ variable.name }}</span>
                <span class="wsp-variable-desc">{{ variable.description || variable.type }}</span>
              </div>
            </div>
            <code class="wsp-variable-preview">{{ previewVariable(variable) }}</code>
            <BaseButton
              v-if="variable.type === 'secret'"
              size="icon"
              variant="ghost"
              :title="revealedSecrets[variable.name] ? 'Hide secret' : 'Show secret'"
              @click="revealedSecrets[variable.name] = !revealedSecrets[variable.name]"
            >
              <template #left>
                <LucideIcon :name="revealedSecrets[variable.name] ? 'eye-off' : 'eye'" :size="13" />
              </template>
            </BaseButton>
            <BaseButton
              size="icon"
              variant="ghost"
              title="Delete variable"
              @click="removeVariable(variable.name)"
            >
              <template #left>
                <LucideIcon name="trash-2" :size="13" />
              </template>
            </BaseButton>
          </div>
        </div>
        <div v-else class="wsp-variable-empty">No variables found</div>
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
