<template>
  <BaseSegmentedSelect
    class="web-page-binding-mode-toggle"
    :model-value="modelValue"
    :options="options"
    aria-label="Return binding mode"
    :icon-size="12"
    @update:model-value="$emit('update:modelValue', $event as 'single' | 'multiple')"
  />
</template>

<script setup lang="ts">
import BaseSegmentedSelect from '@/shared/components/base/BaseSegmentedSelect.vue'

defineProps<{
  modelValue: 'single' | 'multiple'
}>()

defineEmits<{
  'update:modelValue': [value: 'single' | 'multiple']
}>()

const options = [
  { value: 'single', label: 'Single', icon: 'minus' },
  { value: 'multiple', label: 'Multiple', icon: 'list' },
]
</script>
