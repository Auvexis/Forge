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
  gap: var(--nod8-space-1);
  font-family: var(--nod8-font-sans);
  font-weight: var(--nod8-font-medium);
  border-radius: var(--nod8-radius-full);
  white-space: nowrap;
  user-select: none;
}

/* ── Sizes ─────────────────────────────────────── */
.base-badge--sm {
  height: 20px;
  padding: 0 var(--nod8-space-2);
  font-size: 11px;
}

.base-badge--md {
  height: 24px;
  padding: 0 var(--nod8-space-3);
  font-size: 12px;
}

.base-badge__icon {
  flex-shrink: 0;
}

/* ── Variants ──────────────────────────────────── */

/* Default (Muted) */
.base-badge--default {
  background-color: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
  border: 1px solid var(--nod8-border-strong);
}

/* Brand */
.base-badge--brand {
  background-color: var(--nod8-accent-subtle);
  color: var(--nod8-brand-300);
  border: 1px solid var(--nod8-border-brand);
}

/* Success */
.base-badge--success {
  background-color: rgba(16, 185, 129, 0.15);
  color: var(--nod8-green-400);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

/* Warning */
.base-badge--warning {
  background-color: rgba(245, 158, 11, 0.15);
  color: var(--nod8-amber-400);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

/* Error */
.base-badge--error {
  background-color: rgba(239, 68, 68, 0.15);
  color: var(--nod8-red-400);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Outline */
.base-badge--outline {
  background-color: transparent;
  color: var(--nod8-text-secondary);
  border: 1px solid var(--nod8-border-strong);
}
</style>
