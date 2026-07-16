<template>
  <article
    class="web-page-blueprint-element"
    :class="[
      `web-page-blueprint-element--${variant}`,
      { 'web-page-blueprint-element--selected': selected },
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

    <footer v-if="showFooter" class="web-page-blueprint-element__footer">
      <slot name="footer">
        <span v-if="inputLabel"><i class="web-page-blueprint-element__port-dot" /> {{ inputLabel }}</span>
        <span v-if="outputLabel">{{ outputLabel }} <i class="web-page-blueprint-element__port-dot" /></span>
      </slot>
    </footer>
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
  variant?: 'default' | 'compact'
  showFooter?: boolean
  inputLabel?: string
  outputLabel?: string
}>(), {
  detail: '',
  meta: '',
  accent: 'var(--fabric-accent)',
  selected: false,
  variant: 'default',
  showFooter: false,
  inputLabel: 'Input',
  outputLabel: 'Output',
})
</script>
