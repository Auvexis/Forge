<template>
  <BaseUtilityNode
    title="Run Workflow"
    eyebrow="Action"
    icon="workflow"
    accent="var(--fabric-accent)"
    :selected="selected"
  >
    <BaseField
      v-for="field in fields"
      :key="field.id"
      :label="field.label"
      :type="field.type"
      :input="field.direction === 'input' || field.direction === 'both'"
      :output="field.direction === 'output' || field.direction === 'both'"
      :mode="field.mode"
      :value="field.expression ?? field.value"
    />
  </BaseUtilityNode>
</template>

<script setup lang="ts">
import type { PageBlueprintField } from '../pageBlueprintSchema.ts'
import BaseField from './BaseField.vue'
import BaseUtilityNode from './BaseUtilityNode.vue'

defineProps<{
  fields: PageBlueprintField[]
  selected?: boolean
}>()
</script>
