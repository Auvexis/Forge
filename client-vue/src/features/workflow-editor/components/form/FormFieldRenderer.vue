<template>
  <label class="form-renderer-field">
    <span>
      {{ field.label || field.name }}
      <em v-if="field.required">*</em>
    </span>
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

const inputType = computed(() => {
  const type = props.field.type
  return type === 'date' || type === 'password' || type === 'number' || type === 'email'
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
</script>
