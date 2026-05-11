<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  modelValue: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

defineExpose({
  focus: () => inputRef.value?.focus(),
})
</script>

<template>
  <div class="cp-search">
    <input
      ref="inputRef"
      class="cp-search__input"
      :value="modelValue"
      type="search"
      autocomplete="off"
      spellcheck="false"
      placeholder="Search commands"
      aria-label="Search commands"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <span v-if="loading" class="cp-search__status">Loading</span>
  </div>
</template>
