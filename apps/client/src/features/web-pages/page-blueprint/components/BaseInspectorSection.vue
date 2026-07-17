<template>
  <section class="web-page-blueprint-inspector-section">
    <header>
      <LucideIcon name="chevron-down" :size="12" />
      <LucideIcon v-if="icon" :name="icon" :size="13" />
      <span>{{ title }}</span>
    </header>
    <div class="web-page-blueprint-inspector-section__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(defineProps<{
  title: string
  icon?: string
}>(), {
  icon: '',
})
</script>
