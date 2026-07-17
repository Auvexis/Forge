<template>
  <span class="web-page-blueprint-field-mode" data-base-canvas-no-drag>
    <button
      type="button"
      :class="{ 'is-active': modelValue === 'single' }"
      title="Single value"
      @click.stop="$emit('update:modelValue', 'single')"
    >
      S
    </button>
    <button
      type="button"
      :class="{ 'is-active': modelValue === 'multiple' }"
      title="Multiple values"
      @click.stop="$emit('update:modelValue', 'multiple')"
    >
      M
    </button>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue?: 'single' | 'multiple'
}>(), {
  modelValue: 'single',
})

defineEmits<{
  'update:modelValue': [mode: 'single' | 'multiple']
}>()
</script>
