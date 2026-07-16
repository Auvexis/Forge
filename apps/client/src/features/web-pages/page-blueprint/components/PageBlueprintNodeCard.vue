<template>
  <article class="web-page-blueprint-node-card">
    <span class="web-page-blueprint-node-card__icon">
      <LucideIcon :name="icon" :size="14" />
    </span>
    <div>
      <strong>{{ title }}</strong>
      <span>{{ detail }}</span>
    </div>
    <code v-if="meta">{{ meta }}</code>
  </article>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(
  defineProps<{
    title: string
    detail: string
    meta?: string
    icon?: string
  }>(),
  {
    icon: 'box',
    meta: '',
  },
)
</script>
