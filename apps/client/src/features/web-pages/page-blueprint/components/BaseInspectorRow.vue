<template>
  <label class="web-page-blueprint-inspector-row">
    <span class="web-page-blueprint-inspector-row__label">{{ label }}</span>
    <input
      v-if="editable"
      class="web-page-blueprint-inspector-row__control"
      :value="value"
      :placeholder="placeholder"
      @input="$emit('update:value', ($event.target as HTMLInputElement).value)"
    />
    <code v-else class="web-page-blueprint-inspector-row__value">{{ value || '-' }}</code>
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value?: string
  placeholder?: string
  editable?: boolean
}>(), {
  value: '',
  placeholder: '',
  editable: false,
})

defineEmits<{
  'update:value': [value: string]
}>()
</script>
