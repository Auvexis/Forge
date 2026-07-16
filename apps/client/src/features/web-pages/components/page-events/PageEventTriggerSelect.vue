<template>
  <BaseSelect
    :model-value="modelValue"
    :options="options"
    placeholder="Event"
    @update:model-value="$emit('update:modelValue', $event as PageElementEventName)"
  />
</template>

<script setup lang="ts">
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import type { PageElementEventName } from '../../types/page.types.ts'
import type { PageElementEventOption } from '../../page-events/pageElementEvents.types.ts'

defineProps<{
  modelValue: PageElementEventName
  options: PageElementEventOption[]
}>()

defineEmits<{
  'update:modelValue': [value: PageElementEventName]
}>()
</script>
