<template>
  <section class="web-page-blueprint-panel">
    <header>
      <div>
        <LucideIcon :name="icon" :size="13" />
        <strong>{{ title }}</strong>
      </div>
      <code>{{ count }}</code>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(
  defineProps<{
    title: string
    count: number
    icon?: string
  }>(),
  {
    icon: 'panel-top',
  },
)
</script>
