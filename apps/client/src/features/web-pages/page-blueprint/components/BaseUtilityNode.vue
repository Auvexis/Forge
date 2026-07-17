<template>
  <article
    class="web-page-blueprint-utility-node"
    :class="{
      'web-page-blueprint-utility-node--selected': selected,
      'web-page-blueprint-utility-node--dimmed': dimmed,
    }"
    :style="{ '--web-page-blueprint-utility-accent': accent }"
  >
    <header class="web-page-blueprint-utility-node__header">
      <span class="web-page-blueprint-utility-node__icon">
        <LucideIcon :name="icon" :size="15" />
      </span>
      <span class="web-page-blueprint-utility-node__title">
        <small>{{ eyebrow }}</small>
        <strong>{{ title }}</strong>
      </span>
      <LucideIcon name="grip-vertical" :size="12" class="web-page-blueprint-utility-node__grip" />
    </header>

    <div class="web-page-blueprint-utility-node__body">
      <slot />
    </div>
  </article>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(defineProps<{
  title: string
  eyebrow?: string
  icon: string
  accent?: string
  selected?: boolean
  dimmed?: boolean
}>(), {
  eyebrow: 'Utility',
  accent: 'var(--fabric-accent)',
  selected: false,
  dimmed: false,
})
</script>
