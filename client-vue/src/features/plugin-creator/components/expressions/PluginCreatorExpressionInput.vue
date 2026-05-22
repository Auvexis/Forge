<template>
  <label class="plugin-creator-expression-input">
    <span>{{ label }}</span>
    <input
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <PluginCreatorVariablePicker @select="$emit('update:modelValue', appendVariable($event))" />
  </label>
</template>

<script setup lang="ts">
import PluginCreatorVariablePicker from './PluginCreatorVariablePicker.vue'

const props = defineProps<{ modelValue: string; label: string; placeholder?: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()

const variableRoots = ['params', 'credentials', 'steps']

function appendVariable(variableName: string) {
  return props.modelValue ? `${props.modelValue} ${variableName}` : variableName
}
</script>

<style scoped>
.plugin-creator-expression-input {
  display: grid;
  gap: 7px;
  color: var(--sailor-text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.plugin-creator-expression-input input {
  height: 34px;
  min-width: 0;
  padding: 0 9px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
}
</style>
