<template>
  <label class="web-page-blueprint-inspector-textarea">
    <span>{{ label }}</span>
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      spellcheck="false"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  modelValue: string
  placeholder?: string
}>(), {
  placeholder: '',
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
