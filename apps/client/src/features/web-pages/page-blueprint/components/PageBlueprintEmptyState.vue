<template>
  <div class="web-page-blueprint-empty">
    <LucideIcon :name="icon" :size="16" />
    <strong>{{ title }}</strong>
    <span>{{ detail }}</span>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(
  defineProps<{
    title: string
    detail: string
    icon?: string
  }>(),
  {
    icon: 'info',
  },
)
</script>
