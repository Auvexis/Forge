<template>
  <BaseUtilityNode
    title="Run Workflow"
    eyebrow="Action"
    icon="workflow"
    accent="var(--fabric-accent)"
    :selected="selected"
  >
    <BlueprintNodeFields
      :fields="displayFields"
      @pick-input="$emit('pickInput', $event)"
      @pick-output="$emit('pickOutput', $event)"
      @update-mode="(fieldId, mode) => $emit('updateMode', fieldId, mode)"
    />
  </BaseUtilityNode>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageBlueprintField, PageBlueprintFieldMode } from '../pageBlueprintSchema.ts'
import BaseUtilityNode from './BaseUtilityNode.vue'
import BlueprintNodeFields from './BlueprintNodeFields.vue'

const props = defineProps<{
  fields: PageBlueprintField[]
  selected?: boolean
}>()

defineEmits<{
  pickInput: [fieldId: string]
  pickOutput: [fieldId: string]
  updateMode: [fieldId: string, mode: PageBlueprintFieldMode]
}>()

const displayFields = computed(() => props.fields.map((field) => ({
  id: field.id,
  label: field.label,
  type: field.type,
  input: field.direction === 'input' || field.direction === 'both',
  output: field.direction === 'output' || field.direction === 'both',
  mode: field.mode,
  value: field.expression ?? field.value,
})))
</script>
