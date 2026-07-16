<template>
  <BaseSelect
    :model-value="modelValue"
    :options="options"
    placeholder="Property"
    @update:model-value="$emit('update:modelValue', $event as 'text' | 'value' | 'checked')"
  />
</template>

<script setup lang="ts">
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import type { PageActionBindableElementProperty } from '@/core/page-actions'

defineProps<{
  modelValue: PageActionBindableElementProperty
}>()

defineEmits<{
  'update:modelValue': [value: PageActionBindableElementProperty]
}>()

const options = [
  { value: 'text', label: 'Text', icon: 'type' },
  { value: 'value', label: 'Value', icon: 'text-cursor-input' },
  { value: 'checked', label: 'Checked', icon: 'check-square' },
]
</script>
