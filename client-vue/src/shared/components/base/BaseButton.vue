<template>
  <button
    :class="[
      'base-button',
      `base-button--${variant}`,
      `base-button--${size}`,
      { 'base-button--full': fullWidth },
    ]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <!-- Left Icon (or Loader) -->
    <span v-if="loading" class="base-button__icon-left">
      <LucideIcon name="loader-2" class="spin" :size="iconSize" />
    </span>
    <span v-else-if="iconLeft" class="base-button__icon-left">
      <LucideIcon :name="iconLeft" :size="iconSize" />
    </span>

    <!-- Label -->
    <span v-if="$slots.default" class="base-button__label">
      <slot />
    </span>

    <!-- Right Icon -->
    <span v-if="iconRight && !loading" class="base-button__icon-right">
      <LucideIcon :name="iconRight" :size="iconSize" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    disabled?: boolean
    loading?: boolean
    fullWidth?: boolean
    iconLeft?: string
    iconRight?: string
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    disabled: false,
    loading: false,
    fullWidth: false,
  },
)

const iconSize = computed(() => {
  if (props.size === 'sm') return 14
  if (props.size === 'lg') return 20
  return 16
})

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--nod8-space-2);
  border-radius: var(--nod8-radius-sm);
  font-family: inherit;
  font-weight: var(--nod8-font-medium);
  transition: all var(--nod8-duration-fast) var(--nod8-ease-standard);
  user-select: none;
}

.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.base-button--full {
  width: 100%;
}

/* ── Sizes ─────────────────────────────────────── */
.base-button--sm {
  height: 28px;
  padding: 0 var(--nod8-space-3);
  font-size: var(--nod8-text-xs);
}

.base-button--md {
  height: 36px;
  padding: 0 var(--nod8-space-4);
  font-size: var(--nod8-text-sm);
}

.base-button--lg {
  height: 44px;
  padding: 0 var(--nod8-space-6);
  font-size: var(--nod8-text-base);
}

.base-button--icon {
  width: 36px;
  height: 36px;
  padding: 0;
}

/* ── Variants ──────────────────────────────────── */
/* Primary */
.base-button--primary {
  background-color: var(--nod8-accent);
  color: #fff;
  border: 1px solid transparent;
}
.base-button--primary:hover {
  background-color: var(--nod8-accent-hover);
}
.base-button--primary:active {
  background-color: var(--nod8-brand-600);
}

/* Secondary */
.base-button--secondary {
  background-color: var(--nod8-bg-overlay);
  color: var(--nod8-text-primary);
  border: 1px solid var(--nod8-border-strong);
}
.base-button--secondary:hover {
  background-color: var(--nod8-bg-muted);
}
.base-button--secondary:active {
  background-color: var(--nod8-bg-surface);
}

/* Outline */
.base-button--outline {
  background-color: transparent;
  color: var(--nod8-text-primary);
  border: 1px solid var(--nod8-border-strong);
}
.base-button--outline:hover {
  background-color: var(--nod8-bg-overlay);
}

/* Ghost */
.base-button--ghost {
  background-color: transparent;
  color: var(--nod8-text-secondary);
  border: 1px solid transparent;
}
.base-button--ghost:hover {
  background-color: var(--nod8-bg-overlay);
  color: var(--nod8-text-primary);
}

/* Danger */
.base-button--danger {
  background-color: var(--nod8-red-600);
  color: #fff;
  border: 1px solid transparent;
}
.base-button--danger:hover {
  background-color: var(--nod8-red-500);
}

.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
