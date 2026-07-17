<template>
  <article
    class="web-page-blueprint-element"
    :class="[
      `web-page-blueprint-element--${variant}`,
      {
        'web-page-blueprint-element--selected': selected,
        'web-page-blueprint-element--dimmed': dimmed,
      },
    ]"
    :style="{ '--web-page-blueprint-element-accent': accent }"
  >
    <header class="web-page-blueprint-element__header">
      <span class="web-page-blueprint-element__icon">
        <LucideIcon :name="icon" :size="15" />
      </span>
      <span class="web-page-blueprint-element__title">
        <small>{{ eyebrow }}</small>
        <strong>{{ title }}</strong>
      </span>
      <LucideIcon name="grip-vertical" :size="12" class="web-page-blueprint-element__grip" />
    </header>

    <div class="web-page-blueprint-element__body">
      <slot>
        <span>{{ detail }}</span>
        <code v-if="meta">{{ meta }}</code>
      </slot>
    </div>
  </article>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(defineProps<{
  title: string
  eyebrow: string
  icon: string
  detail?: string
  meta?: string
  accent?: string
  selected?: boolean
  dimmed?: boolean
  variant?: 'default' | 'compact'
}>(), {
  detail: '',
  meta: '',
  accent: 'var(--fabric-accent)',
  selected: false,
  dimmed: false,
  variant: 'default',
})
</script>
