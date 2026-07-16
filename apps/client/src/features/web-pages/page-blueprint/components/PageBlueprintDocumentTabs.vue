<template>
  <nav class="web-page-blueprint-tabs" aria-label="Pages document tabs">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="web-page-blueprint-tabs__item"
      :class="{ 'web-page-blueprint-tabs__item--active': tab.id === modelValue }"
      @click="$emit('update:modelValue', tab.id)"
    >
      <LucideIcon :name="tab.icon" :size="13" />
      <span>{{ tab.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{
  modelValue: string
  tabs: Array<{ id: string; label: string; icon: string }>
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
