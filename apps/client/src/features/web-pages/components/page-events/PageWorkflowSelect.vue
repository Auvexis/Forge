<template>
  <BaseSelect
    :model-value="modelValue"
    :options="options"
    placeholder="Workflow"
    @update:model-value="$emit('update:modelValue', String($event))"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import type { PageActionWorkflowSummary } from '@/core/page-actions'

const props = defineProps<{
  modelValue: string
  workflows: PageActionWorkflowSummary[]
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const options = computed(() =>
  props.workflows.map((workflow) => ({
    value: workflow.id,
    label: workflow.name,
    icon: 'workflow',
  })),
)
</script>
