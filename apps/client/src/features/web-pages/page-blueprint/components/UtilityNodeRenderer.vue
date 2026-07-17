<template>
  <component
    :is="specificComponent"
    v-if="specificComponent"
    :fields="node.fields"
    :selected="selected"
  />

  <BaseUtilityNode
    v-else
    :title="node.label"
    :eyebrow="utilityEyebrow"
    :icon="node.icon || 'box'"
    :accent="node.accent || 'var(--fabric-accent)'"
    :selected="selected"
  >
    <BaseField
      v-for="field in node.fields"
      :key="field.id"
      :label="field.label"
      :type="field.type"
      :value="field.expression ?? field.value"
      :input="field.direction === 'input' || field.direction === 'both'"
      :output="field.direction === 'output' || field.direction === 'both'"
      :mode="field.mode"
    />
  </BaseUtilityNode>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageBlueprintUtilityNode } from '../pageBlueprintSchema.ts'
import BaseField from './BaseField.vue'
import BaseUtilityNode from './BaseUtilityNode.vue'
import RunWorkflowNode from './RunWorkflowNode.vue'
import TransformDataNode from './TransformDataNode.vue'

const props = withDefaults(defineProps<{
  node: PageBlueprintUtilityNode
  selected?: boolean
}>(), {
  selected: false,
})

const specificComponent = computed(() => {
  if (props.node.type === 'run-workflow') return RunWorkflowNode
  if (props.node.type === 'transform-data') return TransformDataNode
  return null
})

const utilityEyebrow = computed(() => props.node.type.replaceAll('-', ' '))
</script>
