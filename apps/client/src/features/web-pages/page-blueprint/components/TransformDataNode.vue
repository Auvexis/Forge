<template>
  <BaseUtilityNode
    :title="title"
    eyebrow="Data"
    icon="braces"
    accent="var(--fabric-text-error)"
    :selected="selected"
    :dimmed="dimmed"
  >
    <BlueprintNodeFields
      :node-id="nodeId"
      :fields="displayFields"
      @pick-input="(fieldId, event) => $emit('pickInput', fieldId, event)"
      @pick-output="(fieldId, event) => $emit('pickOutput', fieldId, event)"
      @update-mode="(fieldId, mode) => $emit('updateMode', fieldId, mode)"
    />
  </BaseUtilityNode>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageBlueprintField, PageBlueprintFieldMode } from '../pageBlueprintSchema.ts'
import BaseUtilityNode from './BaseUtilityNode.vue'
import BlueprintNodeFields from './BlueprintNodeFields.vue'

const props = withDefaults(defineProps<{
  fields: PageBlueprintField[]
  nodeId: string
  title?: string
  selected?: boolean
  dimmed?: boolean
}>(), {
  title: 'Transform Data',
  selected: false,
  dimmed: false,
})

defineEmits<{
  pickInput: [fieldId: string, event: PointerEvent]
  pickOutput: [fieldId: string, event: PointerEvent]
  updateMode: [fieldId: string, mode: PageBlueprintFieldMode]
}>()

const displayFields = computed(() => props.fields.map((field) => ({
  id: field.id,
  label: field.label,
  type: field.type,
  input: field.direction === 'input' || field.direction === 'both',
  output: field.direction === 'output' || field.direction === 'both',
  inputConnected: field.inputConnected,
  outputConnected: field.outputConnected,
  mode: field.mode,
  value: field.expression ?? field.value,
})))
</script>
