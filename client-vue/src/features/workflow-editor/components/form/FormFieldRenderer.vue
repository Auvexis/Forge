<template>
  <label class="form-renderer-field">
    <span>
      {{ field.label || field.name }}
      <em v-if="field.required">*</em>
    </span>
    <small v-if="field.description" class="form-renderer-field-description">
      {{ field.description }}
    </small>
    <textarea
      v-if="field.type === 'textarea'"
      :value="stringValue"
      :required="field.required"
      :placeholder="field.placeholder"
      @input="emitValue(($event.target as HTMLTextAreaElement).value)"
    ></textarea>
    <input
      v-else-if="field.type === 'file'"
      type="file"
      :required="field.required"
      @change="onFileChange"
    />
    <select
      v-else-if="field.type === 'select'"
      :value="stringValue"
      :required="field.required"
      @change="emitValue(($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ field.placeholder || 'Select...' }}</option>
      <option v-for="option in field.options || []" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <select
      v-else-if="field.type === 'multiselect'"
      multiple
      :value="arrayValue"
      :required="field.required"
      @change="onMultiSelectChange"
    >
      <option v-for="option in field.options || []" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <label v-else-if="field.type === 'checkbox'" class="form-renderer-choice">
      <input
        type="checkbox"
        :checked="Boolean(value)"
        :required="field.required"
        @change="emitValue(($event.target as HTMLInputElement).checked)"
      />
      <span>{{ field.placeholder || 'Yes' }}</span>
    </label>
    <div
      v-else-if="field.type === 'checkbox-group' || field.type === 'radio' || field.type === 'quiz'"
      class="form-renderer-choice-group"
      :class="{ 'form-renderer-choice-group--quiz': field.type === 'quiz' }"
    >
      <label v-for="option in field.options || []" :key="option.value" class="form-renderer-choice">
        <input
          :type="field.type === 'checkbox-group' ? 'checkbox' : 'radio'"
          :name="field.name"
          :value="option.value"
          :checked="isOptionChecked(option.value)"
          :required="field.required && field.type !== 'checkbox-group'"
          @change="onChoiceChange(option.value, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ option.label }}</span>
      </label>
    </div>
    <input
      v-else
      :type="inputType"
      :value="stringValue"
      :required="field.required"
      :placeholder="field.placeholder"
      @input="emitValue(($event.target as HTMLInputElement).value)"
    />
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormTriggerField } from '@/core/types/workflow.types'

const props = defineProps<{
  field: FormTriggerField
  value: unknown
}>()

const emit = defineEmits<{
  'update:value': [value: unknown]
}>()

const stringValue = computed(() => (typeof props.value === 'string' ? props.value : ''))
const arrayValue = computed(() => (Array.isArray(props.value) ? props.value.map(String) : []))

const inputType = computed(() => {
  const type = props.field.type
  return type === 'date' ||
    type === 'password' ||
    type === 'number' ||
    type === 'email' ||
    type === 'tel' ||
    type === 'url'
    ? type
    : 'text'
})

function emitValue(value: unknown) {
  emit('update:value', value)
}

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emitValue(file)
}

function onMultiSelectChange(event: Event) {
  const selected = Array.from((event.target as HTMLSelectElement).selectedOptions)
    .map((option) => option.value)
  emitValue(selected)
}

function isOptionChecked(value: string) {
  return props.field.type === 'checkbox-group'
    ? arrayValue.value.includes(value)
    : props.value === value
}

function onChoiceChange(value: string, checked: boolean) {
  if (props.field.type === 'checkbox-group') {
    const current = new Set(arrayValue.value)
    if (checked) current.add(value)
    else current.delete(value)
    emitValue([...current])
    return
  }

  if (checked) emitValue(value)
}
</script>
