<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  modelValue: string
  loading?: boolean
  activeDescendant?: string
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
      id="cp-search-input"
      class="cp-search__input"
      :value="modelValue"
      type="search"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      placeholder="Search commands"
      aria-label="Search commands"
      aria-autocomplete="list"
      aria-expanded="true"
      aria-controls="cp-result-listbox"
      :aria-activedescendant="activeDescendant"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <span v-if="loading" class="cp-search__status" aria-live="polite" aria-atomic="true">Loading</span>
  </div>
</template>
