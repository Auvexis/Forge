<template>
  <div class="error-condition-editor">
    <div class="error-condition-editor__grid error-condition-editor__grid--3">
      <BaseInput
        :model-value="mapping.code"
        label="Code"
        placeholder="REQUEST_FAILED"
        @update:model-value="updateMapping({ code: String($event) })"
      />
      <BaseSelect
        :model-value="mapping.condition.source"
        :options="errorSourceOptions"
        label="source"
        @update:model-value="updateCondition({ source: String($event) as any })"
      />
      <BaseSelect
        :model-value="mapping.condition.operator"
        :options="errorOperatorOptions"
        label="operator"
        @update:model-value="updateCondition({ operator: String($event) as any })"
      />
    </div>
    <div class="error-condition-editor__grid error-condition-editor__grid--2">
      <BaseInput
        :model-value="String(mapping.condition.path ?? '')"
        label="Body path"
        placeholder="body.error.code"
        @update:model-value="updateCondition({ path: String($event) })"
      />
      <BaseInput
        :model-value="String(mapping.condition.value ?? '')"
        label="Compare value"
        placeholder="400"
        @update:model-value="updateCondition({ value: normalizeValue(String($event)) })"
      />
    </div>
    <BaseInput
      :model-value="messageValue"
      label="Message"
      placeholder="Request failed"
      @update:model-value="updateMapping({ message: { type: 'static', value: String($event) } })"
    />
    <div class="error-condition-editor__actions">
      <button type="button" title="Remove" aria-label="Remove" @click="emit('remove')">
        <LucideIcon name="x" :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type {
  PluginBlueprintErrorCondition,
  PluginBlueprintErrorMapping,
} from '@/core/types/plugin-creator.types'

const props = defineProps<{
  mapping: PluginBlueprintErrorMapping
}>()

const emit = defineEmits<{
  update: [mapping: PluginBlueprintErrorMapping]
  remove: []
}>()

const errorSourceOptions = ['status', 'body'].map((value) => ({ value, label: value }))
const errorOperatorOptions = (
  [
    ['equals', 'equals'],
    ['notEquals', 'not equals'],
    ['greaterThan', 'greater than'],
    ['greaterThanOrEquals', 'greater/equal'],
    ['lessThan', 'less than'],
    ['lessThanOrEquals', 'less/equal'],
    ['exists', 'exists'],
    ['notExists', 'not exists'],
  ] satisfies Array<[string, string]>
).map(([value, label]) => ({ value, label }))

const messageValue = computed(() =>
  props.mapping.message.type === 'static'
    ? props.mapping.message.value
    : props.mapping.message.path,
)

function updateMapping(payload: Partial<PluginBlueprintErrorMapping>) {
  emit('update', { ...props.mapping, ...payload })
}

function updateCondition(payload: Partial<PluginBlueprintErrorCondition>) {
  updateMapping({ condition: { ...props.mapping.condition, ...payload } })
}

function normalizeValue(value: string) {
  return value.trim() !== '' && !Number.isNaN(Number(value)) ? Number(value) : value
}
</script>

<style scoped>
.error-condition-editor {
  display: grid;
  gap: 12px;
}

.error-condition-editor__grid {
  display: grid;
  gap: 12px;
}

.error-condition-editor__grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.error-condition-editor__grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.error-condition-editor__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.error-condition-editor__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  padding: 0;
}
</style>
