<script lang="ts">
export default {
  name: 'WorkflowVariablesModal',
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useWorkflowStore } from '../../stores/workflow.store'
import type { WorkflowVariable } from '@/core/types/workflow.types'

defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()

const workflowStore = useWorkflowStore()
const variableSearch = ref('')
const showCreate = ref(false)
const variableDraft = ref<WorkflowVariable>({
  name: '',
  type: 'string',
  defaultValue: '',
})

const filteredVariables = computed(() => {
  const variables = workflowStore.activeWorkflow?.variables ?? []
  const q = variableSearch.value.trim().toLowerCase()
  if (!q) return variables
  return variables.filter((variable) =>
    [variable.name, variable.defaultValue ?? ''].some((value) =>
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

function normalizeDefaultValue(value: string): string | number {
  const trimmed = value.trim()
  if (trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  return value
}

function addVariable() {
  if (!workflowStore.activeWorkflow) return
  const name = variableDraft.value.name.trim()
  if (!name) return

  const nextVariable: WorkflowVariable = {
    name,
    type: typeof normalizeDefaultValue(variableDefaultValue.value) === 'number' ? 'number' : 'string',
    defaultValue: normalizeDefaultValue(variableDefaultValue.value),
  }
  const variables = workflowStore.activeWorkflow.variables ?? []
  const existingIndex = variables.findIndex((variable) => variable.name === name)
  if (existingIndex >= 0) {
    variables[existingIndex] = nextVariable
  } else {
    variables.push(nextVariable)
  }
  workflowStore.activeWorkflow.variables = [...variables]
  variableDraft.value = { name: '', type: 'string', defaultValue: '' }
  showCreate.value = false
}

function removeVariable(name: string) {
  if (!workflowStore.activeWorkflow) return
  workflowStore.activeWorkflow.variables = (workflowStore.activeWorkflow.variables ?? []).filter(
    (variable) => variable.name !== name,
  )
}

function previewVariable(variable: WorkflowVariable): string {
  if (variable.defaultValue === undefined || variable.defaultValue === '') return 'empty'
  return String(variable.defaultValue)
}

function variableToken(variable: WorkflowVariable): string {
  return `{{ variables.${variable.name} }}`
}

function onVariableDragStart(event: DragEvent, variable: WorkflowVariable) {
  event.dataTransfer?.setData('text/plain', variableToken(variable))
}
</script>

<template>
  <BaseModal :is-open="isOpen" max-width="980px" height="78vh" @close="$emit('close')">
    <div class="wvm-shell">
      <header class="wvm-header">
        <div class="wvm-title">
          <LucideIcon name="tags" :size="16" />
          <h2>Workflow Variables</h2>
        </div>
        <div class="wvm-header__actions">
          <BaseInput v-model="variableSearch" icon-left="search" placeholder="Search variables" />
          <div class="wvm-create">
            <BaseButton size="icon" variant="secondary" title="Add variable" @click="showCreate = !showCreate">
              <template #left>
                <LucideIcon name="plus" :size="15" />
              </template>
            </BaseButton>
            <form v-if="showCreate" class="wvm-create__dropdown" @submit.prevent="addVariable">
              <BaseInput v-model="variableDraft.name" label="Name" placeholder="customer_id" />
              <BaseTextarea
                v-model="variableDefaultValue"
                label="Value"
                placeholder="Text or number"
                :rows="3"
              />
              <BaseButton size="sm" variant="primary" icon-left="plus" type="submit">
                Add Variable
              </BaseButton>
            </form>
          </div>
          <BaseButton size="icon" variant="ghost" title="Close" @click="$emit('close')">
            <template #left>
              <LucideIcon name="x" :size="16" />
            </template>
          </BaseButton>
        </div>
      </header>

      <div class="wvm-content">
        <section class="wvm-list" aria-label="Workflow variables">
          <div
            v-for="variable in filteredVariables"
            :key="variable.name"
            class="wvm-row"
            draggable="true"
            @dragstart="onVariableDragStart($event, variable)"
          >
            <div class="wvm-row__main">
              <LucideIcon name="tag" :size="14" />
              <div class="wvm-row__meta">
                <span class="wvm-row__name">{{ variable.name }}</span>
                <span class="wvm-row__desc">{{ previewVariable(variable) }}</span>
              </div>
            </div>
            <code class="wvm-row__token">{{ variableToken(variable) }}</code>
            <code class="wvm-row__preview">{{ previewVariable(variable) }}</code>
            <div class="wvm-row__actions">
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

          <div v-if="filteredVariables.length === 0" class="wvm-empty">No variables found</div>
        </section>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.wvm-shell {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.wvm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-3) var(--fabric-space-4);
  border-bottom: 1px solid var(--fabric-border);
  background: var(--fabric-bg-surface);
}

.wvm-title,
.wvm-header__actions {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
}

.wvm-create {
  position: relative;
  flex: 0 0 auto;
}

.wvm-create__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: var(--fabric-z-popover);
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-3);
  width: 260px;
  padding: var(--fabric-space-3);
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-surface);
  box-shadow: var(--fabric-shadow-lg);
}

.wvm-title h2 {
  margin: 0;
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-semibold);
  color: var(--fabric-text-primary);
}

.wvm-content {
  display: flex;
  min-height: 0;
  flex: 1;
}

.wvm-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
  padding: var(--fabric-space-3);
  gap: var(--fabric-space-2);
}

.wvm-row {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(180px, 240px) minmax(120px, 1fr) auto;
  align-items: center;
  gap: var(--fabric-space-2);
  padding: var(--fabric-space-3);
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-surface);
  cursor: grab;
}

.wvm-row__main,
.wvm-row__actions {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
  min-width: 0;
}

.wvm-row__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.wvm-row__name,
.wvm-row__token,
.wvm-row__preview {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.wvm-row__name {
  font-family: var(--fabric-font-mono);
  font-size: var(--fabric-text-xs);
  color: var(--fabric-text-primary);
}

.wvm-row__desc,
.wvm-empty {
  font-size: var(--fabric-text-xs);
  color: var(--fabric-text-muted);
}

.wvm-row__token,
.wvm-row__preview {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--fabric-bg-base);
  font-size: 10px;
  color: var(--fabric-text-muted);
  white-space: pre-wrap;
}

.wvm-empty {
  padding: var(--fabric-space-4);
  border: 1px dashed var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  text-align: center;
}

@media (max-width: 820px) {
  .wvm-header,
  .wvm-header__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .wvm-content {
    display: flex;
  }

  .wvm-row {
    grid-template-columns: 1fr auto;
  }

  .wvm-row__token,
  .wvm-row__preview {
    grid-column: 1 / -1;
  }
}
</style>
