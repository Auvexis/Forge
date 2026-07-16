<template>
  <article class="web-page-blueprint-connection-row">
    <span>{{ source }}</span>
    <LucideIcon name="arrow-right" :size="12" />
    <strong>{{ target }}</strong>
    <code>{{ mode }}</code>
  </article>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{
  source: string
  target: string
  mode: 'single' | 'multiple'
}>()
</script>
