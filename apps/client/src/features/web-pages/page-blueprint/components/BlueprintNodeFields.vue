<template>
  <BaseField
    v-for="field in fields"
    :key="field.id"
    :label="field.label"
    :type="field.type"
    :value="field.value"
    :input="field.input"
    :output="field.output"
    :input-connected="field.inputConnected"
    :output-connected="field.outputConnected"
    :mode="field.mode"
    @pick-input="$emit('pickInput', field.id, $event)"
    @pick-output="$emit('pickOutput', field.id, $event)"
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
  inputConnected?: boolean
  outputConnected?: boolean
  mode?: PageBlueprintFieldMode
}

defineProps<{
  fields: BlueprintNodeDisplayField[]
}>()

defineEmits<{
  pickInput: [fieldId: string, event: PointerEvent]
  pickOutput: [fieldId: string, event: PointerEvent]
  updateMode: [fieldId: string, mode: PageBlueprintFieldMode]
}>()
</script>
