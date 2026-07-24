<template>
  <span
    class="base-badge"
    :class="[`base-badge--${variant}`, `base-badge--${size}`]"
    v-bind="$attrs"
  >
    <LucideIcon v-if="icon" :name="icon" :size="iconSize" class="base-badge__icon" />
    <slot>{{ text }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'brand' | 'outline'
export type BadgeSize = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    text?: string
    variant?: BadgeVariant
    size?: BadgeSize
    icon?: string
  }>(),
  {
    variant: 'default',
    size: 'md',
  },
)

const iconSize = computed(() => (props.size === 'sm' ? 12 : 14))

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--fabric-space-1);
  font-family: var(--fabric-font-sans);
  font-weight: var(--fabric-font-medium);
  border-radius: var(--fabric-base-badge-radius);
  white-space: nowrap;
  user-select: none;
}

/* ── Sizes ─────────────────────────────────────── */
.base-badge--sm {
  height: 20px;
  padding: 0 var(--fabric-space-2);
  font-size: 11px;
}

.base-badge--md {
  height: 24px;
  padding: 0 var(--fabric-space-3);
  font-size: 12px;
}

.base-badge__icon {
  flex-shrink: 0;
}

/* ── Variants ──────────────────────────────────── */

/* Default (Muted) */
.base-badge--default {
  background-color: var(--fabric-base-badge-bg-muted);
  color: var(--fabric-base-badge-text-primary);
  border: 1px solid var(--fabric-base-badge-border-strong);
}

/* Brand */
.base-badge--brand {
  background-color: var(--fabric-base-badge-accent-subtle);
  color: var(--fabric-base-badge-brand300);
  border: 1px solid var(--fabric-base-badge-border-brand);
}

/* Success */
.base-badge--success {
  background-color: var(--fabric-base-badge-status-success-bg);
  color: var(--fabric-base-badge-status-success-text);
  border: 1px solid var(--fabric-base-badge-status-success-border);
}

/* Warning */
.base-badge--warning {
  background-color: var(--fabric-base-badge-status-running-bg);
  color: var(--fabric-base-badge-status-running-text);
  border: 1px solid var(--fabric-base-badge-status-running-border);
}

/* Error */
.base-badge--error {
  background-color: var(--fabric-base-badge-status-error-bg);
  color: var(--fabric-base-badge-status-error-text);
  border: 1px solid var(--fabric-base-badge-status-error-border);
}

/* Outline */
.base-badge--outline {
  background-color: transparent;
  color: var(--fabric-base-badge-text-secondary);
  border: 1px solid var(--fabric-base-badge-border-strong);
}
</style>
