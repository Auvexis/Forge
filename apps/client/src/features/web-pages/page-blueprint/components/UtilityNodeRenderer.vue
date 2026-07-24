<template>
  <component
    :is="specificComponent"
    v-if="specificComponent"
    :node-id="node.id"
    :title="node.label"
    :fields="node.fields"
    :selected="selected"
    :dimmed="dimmed"
    @pick-input="(fieldId, event) => $emit('pickInput', fieldId, event)"
    @pick-output="(fieldId, event) => $emit('pickOutput', fieldId, event)"
    @update-mode="(fieldId, mode) => $emit('updateMode', fieldId, mode)"
  />

  <BaseUtilityNode
    v-else
    :title="node.label"
    :eyebrow="utilityEyebrow"
    :icon="node.icon || 'box'"
    :accent="node.accent || 'var(--fabric-utility-node-renderer-accent)'"
    :selected="selected"
    :dimmed="dimmed"
  >
    <BlueprintNodeFields
      :node-id="node.id"
      :fields="displayFields"
      @pick-input="(fieldId, event) => $emit('pickInput', fieldId, event)"
      @pick-output="(fieldId, event) => $emit('pickOutput', fieldId, event)"
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
  dimmed?: boolean
}>(), {
  selected: false,
  dimmed: false,
})

defineEmits<{
  pickInput: [fieldId: string, event: PointerEvent]
  pickOutput: [fieldId: string, event: PointerEvent]
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
  inputConnected: field.inputConnected,
  outputConnected: field.outputConnected,
  mode: field.mode,
})))

const utilityEyebrow = computed(() => props.node.type.replaceAll('-', ' '))
</script>
