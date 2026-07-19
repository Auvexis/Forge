<template>
  <nav class="web-page-blueprint-toolbox-tabs" aria-label="Blueprint toolbox sections">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="web-page-blueprint-toolbox-tabs__item"
      :class="{ 'is-active': modelValue === tab.id }"
      type="button"
      @click="$emit('update:modelValue', tab.id)"
    >
      <LucideIcon :name="tab.icon" :size="13" />
      <span>{{ tab.label }}</span>
      <small>{{ tab.count }}</small>
    </button>
  </nav>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{
  modelValue: string
  tabs: Array<{ id: string; label: string; icon: string; count?: number }>
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
