<template>
  <BaseSelect
    :model-value="modelValue"
    :options="options"
    placeholder="Trigger"
    @update:model-value="$emit('update:modelValue', String($event))"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import type { PageActionTriggerSummary } from '@/core/page-actions'

const props = defineProps<{
  modelValue: string
  triggers: PageActionTriggerSummary[]
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const options = computed(() =>
  props.triggers.map((trigger) => ({
    value: trigger.id,
    label: trigger.name,
    icon: trigger.icon ?? 'play-circle',
  })),
)
</script>
