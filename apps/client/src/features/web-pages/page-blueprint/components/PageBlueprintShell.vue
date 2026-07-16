<template>
  <section class="web-page-blueprint-v2">
    <header class="web-page-blueprint-v2__header">
      <div>
        <LucideIcon name="workflow" :size="14" />
        <strong>{{ title }}</strong>
      </div>
      <span>{{ subtitle }}</span>
    </header>
    <div class="web-page-blueprint-v2__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{
  title: string
  subtitle: string
}>()
</script>
