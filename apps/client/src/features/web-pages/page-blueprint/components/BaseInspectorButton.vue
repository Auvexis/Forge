<template>
  <button
    type="button"
    class="web-page-blueprint-inspector-button"
    :class="{ 'web-page-blueprint-inspector-button--danger': variant === 'danger' }"
    @click="$emit('click')"
  >
    <LucideIcon v-if="icon" :name="icon" :size="13" />
    <span>{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(defineProps<{
  label: string
  icon?: string
  variant?: 'default' | 'danger'
}>(), {
  icon: '',
  variant: 'default',
})

defineEmits<{
  click: []
}>()
</script>
