<template>
  <BaseField
    v-for="field in fields"
    :key="field.id"
    :label="field.label"
    :type="field.type"
    :value="field.value"
    :input="field.input"
    :output="field.output"
    :mode="field.mode"
    @pick-input="$emit('pickInput', field.id)"
    @pick-output="$emit('pickOutput', field.id)"
    @update:mode="$emit('updateMode', field.id, $event)"
  />
</template>

<script setup lang="ts">
import type { PageBlueprintFieldMode } from '../pageBlueprintSchema.ts'
import BaseField from './BaseField.vue'

export interface BlueprintNodeDisplayField {
  id: string
  label: string
  type?: string
  value?: string
  input?: boolean
  output?: boolean
  mode?: PageBlueprintFieldMode
}

defineProps<{
  fields: BlueprintNodeDisplayField[]
}>()

defineEmits<{
  pickInput: [fieldId: string]
  pickOutput: [fieldId: string]
  updateMode: [fieldId: string, mode: PageBlueprintFieldMode]
}>()
</script>
