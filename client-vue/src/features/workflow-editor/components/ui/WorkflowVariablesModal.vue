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
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
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
  if (variable.type === 'secret' && !revealedSecrets.value[variable.name]) return '************'
  if (variable.defaultValue === undefined || variable.defaultValue === '') return 'empty'
  if (typeof variable.defaultValue === 'object') return JSON.stringify(variable.defaultValue)
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
          <BaseButton size="icon" variant="ghost" title="Close" @click="$emit('close')">
            <template #left>
              <LucideIcon name="x" :size="16" />
            </template>
          </BaseButton>
        </div>
      </header>

      <div class="wvm-content">
        <section class="wvm-form" aria-label="Create workflow variable">
          <BaseInput v-model="variableDraft.name" label="Name" placeholder="customer_id" />
          <BaseSelect
            v-model="variableDraft.type"
            label="Type"
            :options="variableTypeOptions"
            placeholder="Type"
          />
          <BaseInput
            v-if="variableDraft.type === 'secret'"
            v-model="variableDefaultValue"
            class="wvm-form__wide"
            type="password"
            label="Default value"
            placeholder="Default value"
          />
          <BaseTextarea
            v-else
            v-model="variableDefaultValue"
            class="wvm-form__wide"
            label="Default value"
            placeholder="Default value"
            :rows="3"
          />
          <BaseInput
            v-model="variableDraft.description"
            class="wvm-form__wide"
            label="Description"
            placeholder="What this variable is for"
          />
          <BaseButton size="sm" variant="primary" icon-left="plus" @click="addVariable">
            Add Variable
          </BaseButton>
        </section>

        <section class="wvm-list" aria-label="Workflow variables">
          <div
            v-for="variable in filteredVariables"
            :key="variable.name"
            class="wvm-row"
            draggable="true"
            @dragstart="onVariableDragStart($event, variable)"
          >
            <div class="wvm-row__main">
              <LucideIcon :name="variable.type === 'secret' ? 'key-round' : 'tag'" :size="14" />
              <div class="wvm-row__meta">
                <span class="wvm-row__name">{{ variable.name }}</span>
                <span class="wvm-row__desc">{{ variable.description || variable.type }}</span>
              </div>
            </div>
            <code class="wvm-row__token">{{ variableToken(variable) }}</code>
            <code class="wvm-row__preview">{{ previewVariable(variable) }}</code>
            <div class="wvm-row__actions">
              <BaseButton
                v-if="variable.type === 'secret'"
                size="icon"
                variant="ghost"
                :title="revealedSecrets[variable.name] ? 'Hide secret' : 'Show secret'"
                @click="revealedSecrets[variable.name] = !revealedSecrets[variable.name]"
              >
                <template #left>
                  <LucideIcon
                    :name="revealedSecrets[variable.name] ? 'eye-off' : 'eye'"
                    :size="13"
                  />
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
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-3) var(--nod8-space-4);
  border-bottom: 1px solid var(--nod8-border);
  background: var(--nod8-bg-surface);
}

.wvm-title,
.wvm-header__actions {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
}

.wvm-title h2 {
  margin: 0;
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-text-primary);
}

.wvm-content {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  min-height: 0;
  flex: 1;
}

.wvm-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(110px, 140px);
  align-content: start;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-4);
  border-right: 1px solid var(--nod8-border);
  background: var(--nod8-bg-overlay);
}

.wvm-form__wide,
.wvm-form > :last-child {
  grid-column: 1 / -1;
}

.wvm-form > :last-child {
  justify-self: flex-start;
}

.wvm-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
  padding: var(--nod8-space-3);
  gap: var(--nod8-space-2);
}

.wvm-row {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(180px, 240px) minmax(120px, 1fr) auto;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-3);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  background: var(--nod8-bg-surface);
  cursor: grab;
}

.wvm-row__main,
.wvm-row__actions {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
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
  font-family: var(--nod8-font-mono);
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-primary);
}

.wvm-row__desc,
.wvm-empty {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
}

.wvm-row__token,
.wvm-row__preview {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--nod8-bg-base);
  font-size: 10px;
  color: var(--nod8-text-muted);
  white-space: pre-wrap;
}

.wvm-empty {
  padding: var(--nod8-space-4);
  border: 1px dashed var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  text-align: center;
}

@media (max-width: 820px) {
  .wvm-header,
  .wvm-header__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .wvm-content {
    grid-template-columns: 1fr;
  }

  .wvm-form {
    border-right: none;
    border-bottom: 1px solid var(--nod8-border);
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
