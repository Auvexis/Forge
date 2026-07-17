<template>
  <component
    :is="specificComponent"
    v-if="specificComponent"
    :fields="node.fields"
    :selected="selected"
    @pick-input="$emit('pickInput', $event)"
    @pick-output="$emit('pickOutput', $event)"
    @update-mode="(fieldId, mode) => $emit('updateMode', fieldId, mode)"
  />

  <BaseUtilityNode
    v-else
    :title="node.label"
    :eyebrow="utilityEyebrow"
    :icon="node.icon || 'box'"
    :accent="node.accent || 'var(--fabric-accent)'"
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
import type { PageBlueprintFieldMode, PageBlueprintUtilityNode } from '../pageBlueprintSchema.ts'
import BaseUtilityNode from './BaseUtilityNode.vue'
import BlueprintNodeFields from './BlueprintNodeFields.vue'
import RunWorkflowNode from './RunWorkflowNode.vue'
import TransformDataNode from './TransformDataNode.vue'

const props = withDefaults(defineProps<{
  node: PageBlueprintUtilityNode
  selected?: boolean
}>(), {
  selected: false,
})

defineEmits<{
  pickInput: [fieldId: string]
  pickOutput: [fieldId: string]
  updateMode: [fieldId: string, mode: PageBlueprintFieldMode]
}>()

const specificComponent = computed(() => {
  if (props.node.type === 'run-workflow') return RunWorkflowNode
  if (props.node.type === 'transform-data') return TransformDataNode
  return null
})

const displayFields = computed(() => props.node.fields.map((field) => ({
  id: field.id,
  label: field.label,
  type: field.type,
  value: field.expression ?? field.value,
  input: field.direction === 'input' || field.direction === 'both',
  output: field.direction === 'output' || field.direction === 'both',
  mode: field.mode,
})))

const utilityEyebrow = computed(() => props.node.type.replaceAll('-', ' '))
</script>
