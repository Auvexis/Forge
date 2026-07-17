<template>
  <label class="web-page-blueprint-inspector-row">
    <span>{{ label }}</span>
    <input
      v-if="editable"
      :value="value"
      :placeholder="placeholder"
      @input="$emit('update:value', ($event.target as HTMLInputElement).value)"
    />
    <code v-else>{{ value || '-' }}</code>
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
