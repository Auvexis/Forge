<template>
  <section class="web-page-events-section">
    <header class="web-page-events-section__header">
      <div>
        <LucideIcon :name="icon" :size="13" />
        <strong>{{ title }}</strong>
      </div>
      <slot name="actions" />
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(
  defineProps<{
    title: string
    icon?: string
  }>(),
  {
    icon: 'workflow',
  },
)
</script>
