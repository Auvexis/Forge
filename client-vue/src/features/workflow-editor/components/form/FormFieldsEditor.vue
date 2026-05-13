<template>
  <div class="form-fields-editor">
    <div class="ffe-intro">
      <span class="ffe-label">{{ title }}</span>
      <p v-if="hint" class="ffe-hint" v-html="hint" />
    </div>

    <div class="ffe-list">
      <div v-for="(field, i) in modelValue" :key="i" class="ffe-card">
        <div class="ffe-grid">
          <BaseInput
            :model-value="field.name"
            @update:model-value="updateField(i, { name: $event as string })"
            placeholder="field_name"
            style="font-family: var(--nod8-font-mono)"
          />
          <BaseInput
            :model-value="field.label"
            @update:model-value="updateField(i, { label: $event as string })"
            placeholder="Label"
          />
          <BaseInput
            :model-value="field.description || ''"
            @update:model-value="updateField(i, { description: $event as string })"
            placeholder="Description"
          />
          <BaseSelect
            :model-value="field.type"
            :options="FORM_FIELD_TYPES"
            @update:model-value="updateField(i, { type: $event as FormTriggerField['type'] })"
          />
          <div class="ffe-actions">
            <BaseButton
              type="button"
              :variant="field.required ? 'primary' : 'outline'"
              size="checkbox"
              :icon-left="field.required ? 'check' : undefined"
              :title="field.required ? 'Required field' : 'Optional field'"
              @click="updateField(i, { required: !field.required })"
            />
            <span class="ffe-required">Req</span>
            <BaseButton
              variant="ghost"
              size="icon"
              icon-left="x"
              class="!text-[var(--nod8-text-muted)] hover:!text-[var(--nod8-text-primary)] !p-2"
              @click="removeField(i)"
            />
          </div>
        </div>

        <BaseInput
          v-if="!fieldUsesOptions(field.type) && field.type !== 'file' && field.type !== 'date'"
          class="ffe-options"
          :model-value="field.placeholder || ''"
          @update:model-value="updateField(i, { placeholder: $event as string })"
          :placeholder="field.type === 'checkbox' ? 'Checkbox text (e.g. Yes, I agree)' : 'Placeholder text...'"
        />
        <BaseTextarea
          v-if="fieldUsesOptions(field.type)"
          class="ffe-options"
          :model-value="getFieldOptionsText(field, i)"
          :rows="3"
          placeholder="Option A&#10;Option B&#10;Value C | Label C"
          @update:model-value="updateFieldOptionsText(i, $event)"
        />
        <div v-if="field.type === 'file'" class="ffe-file-row">
          <BaseInput
            style="flex: 1"
            :model-value="field.accept || ''"
            @update:model-value="updateField(i, { accept: $event as string })"
            placeholder="Accept types (e.g. image/*, .pdf)"
          />
          <BaseInput
            style="flex: 1"
            type="number"
            :model-value="field.maxSize?.toString() || ''"
            @update:model-value="updateField(i, { maxSize: $event ? Number($event) : undefined })"
            placeholder="Max Size (MB)"
          />
        </div>
      </div>

      <BaseButton
        variant="dashed"
        size="md"
        icon-left="plus"
        full-width
        class="!rounded-full mt-1"
        @click="addField"
      >
        Add Form Field
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FormTriggerField } from '@/core/types/workflow.types'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

const props = withDefaults(defineProps<{
  modelValue: FormTriggerField[]
  title?: string
  hint?: string
}>(), {
  title: 'Form Fields',
  hint: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: FormTriggerField[]): void
}>()

const FORM_FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: 'type' },
  { value: 'email', label: 'Email', icon: 'mail' },
  { value: 'number', label: 'Number', icon: 'hash' },
  { value: 'textarea', label: 'Textarea', icon: 'align-left' },
  { value: 'date', label: 'Date Picker', icon: 'calendar' },
  { value: 'password', label: 'Password', icon: 'lock-keyhole' },
  { value: 'file', label: 'File', icon: 'file' },
  { value: 'select', label: 'Select', icon: 'list' },
  { value: 'multiselect', label: 'Multi Select', icon: 'list-checks' },
  { value: 'checkbox', label: 'Checkbox', icon: 'square-check' },
  { value: 'checkbox-group', label: 'Checkbox Group', icon: 'list-todo' },
  { value: 'radio', label: 'Radio Group', icon: 'circle-dot' },
  { value: 'quiz', label: 'Quiz Choice', icon: 'badge-help' },
  { value: 'tel', label: 'Phone', icon: 'phone' },
  { value: 'url', label: 'URL', icon: 'link' },
]

const FIELD_TYPES_WITH_OPTIONS = new Set<FormTriggerField['type']>([
  'select',
  'multiselect',
  'checkbox-group',
  'radio',
  'quiz',
])

const optionsTextMap = ref<Record<number, string>>({})

function save(next: FormTriggerField[]) {
  emit('update:modelValue', next)
}

function addField() {
  const idx = props.modelValue.length
  save([
    ...props.modelValue,
    { name: `field_${idx + 1}`, label: `Field ${idx + 1}`, type: 'text', required: false },
  ])
}

function updateField(i: number, updates: Partial<FormTriggerField>) {
  save(props.modelValue.map((field, idx) => (idx === i ? { ...field, ...updates } : field)))
}

function removeField(i: number) {
  save(props.modelValue.filter((_, idx) => idx !== i))
}

function fieldUsesOptions(type: FormTriggerField['type']) {
  return FIELD_TYPES_WITH_OPTIONS.has(type)
}

function formatOptions(options: FormTriggerField['options'] = []) {
  return options.map((option) => (
    option.value === option.label ? option.value : `${option.value} | ${option.label}`
  )).join('\n')
}

function parseOptions(value: string): NonNullable<FormTriggerField['options']> {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawValue = '', rawLabel = ''] = line.split('|')
      const valuePart = rawValue.trim()
      const labelPart = rawLabel.trim()
      return { value: valuePart, label: labelPart || valuePart }
    })
}

function getFieldOptionsText(field: FormTriggerField, i: number) {
  if (optionsTextMap.value[i] !== undefined) return optionsTextMap.value[i]
  return formatOptions(field.options)
}

function updateFieldOptionsText(i: number, value: string) {
  optionsTextMap.value[i] = value
  updateField(i, { options: parseOptions(value) })
}
</script>

<style scoped>
.form-fields-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ffe-intro {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ffe-label {
  color: var(--nod8-text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ffe-hint {
  margin: 0;
  color: var(--nod8-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ffe-list,
.ffe-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ffe-card {
  padding: 10px;
  border: 1px solid var(--nod8-border-subtle);
  border-radius: var(--nod8-radius-md);
  background: var(--nod8-bg-surface);
}

.ffe-grid {
  display: grid;
  grid-template-columns:
    minmax(140px, 1fr)
    minmax(140px, 1fr)
    minmax(150px, 0.85fr)
    minmax(160px, 1fr)
    auto;
  gap: 8px;
  align-items: center;
}

.ffe-options {
  width: 100%;
}

.ffe-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  white-space: nowrap;
}

.ffe-required {
  color: var(--nod8-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.ffe-file-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

@media (max-width: 720px) {
  .ffe-grid,
  .ffe-file-row {
    grid-template-columns: 1fr;
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
