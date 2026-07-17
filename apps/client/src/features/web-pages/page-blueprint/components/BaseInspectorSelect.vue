<template>
  <label class="web-page-blueprint-inspector-row">
    <span class="web-page-blueprint-inspector-row__label">{{ label }}</span>
    <select
      class="web-page-blueprint-inspector-row__control"
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  modelValue: string
  placeholder?: string
  options: Array<{ label: string; value: string }>
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
