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
    <span v-else-if="iconLeft || $slots.left" class="base-button__icon-left">
      <slot name="left">
        <LucideIcon v-if="iconLeft" :name="iconLeft" :size="iconSize" />
      </slot>
    </span>

    <!-- Label -->
    <span v-if="$slots.default" class="base-button__label">
      <slot />
    </span>

    <!-- Right Icon -->
    <span v-if="(iconRight || $slots.right) && !loading" class="base-button__icon-right">
      <slot name="right">
        <LucideIcon v-if="iconRight" :name="iconRight" :size="iconSize" />
      </slot>
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
  background-color: var(--nod8-button-primary-bg);
  color: var(--nod8-button-primary-text);
  border: 1px solid var(--nod8-button-primary-border);
}
.base-button--primary:hover {
  background-color: var(--nod8-button-primary-hover);
  color: var(--nod8-button-primary-text);
}
.base-button--primary:active {
  background-color: var(--nod8-button-primary-active);
  color: var(--nod8-button-primary-active-text);
}

/* Secondary */
.base-button--secondary {
  background-color: var(--nod8-button-secondary-bg);
  color: var(--nod8-button-secondary-text);
  border: 1px solid var(--nod8-button-secondary-border);
}
.base-button--secondary:hover {
  background-color: var(--nod8-button-secondary-hover);
  color: var(--nod8-button-secondary-text);
}
.base-button--secondary:active {
  background-color: var(--nod8-button-secondary-active);
  color: var(--nod8-button-secondary-active-text);
}

/* Outline */
.base-button--outline {
  background-color: var(--nod8-button-outline-bg);
  color: var(--nod8-button-outline-text);
  border: 1px solid var(--nod8-button-outline-border);
}
.base-button--outline:hover {
  background-color: var(--nod8-button-outline-hover);
  color: var(--nod8-button-outline-text);
}
.base-button--outline:active {
  background-color: var(--nod8-button-outline-active);
  color: var(--nod8-button-outline-active-text);
}

/* Ghost */
.base-button--ghost {
  background-color: var(--nod8-button-ghost-bg);
  color: var(--nod8-button-ghost-text);
  border: 1px solid var(--nod8-button-ghost-border);
}
.base-button--ghost:hover {
  background-color: var(--nod8-button-ghost-hover);
  color: var(--nod8-button-ghost-text);
}
.base-button--ghost:active {
  background-color: var(--nod8-button-ghost-active);
  color: var(--nod8-button-ghost-active-text);
}

/* Danger */
.base-button--danger {
  background-color: var(--nod8-button-danger-bg);
  color: var(--nod8-button-danger-text);
  border: 1px solid var(--nod8-button-danger-border);
}
.base-button--danger:hover {
  background-color: var(--nod8-button-danger-hover);
  color: var(--nod8-button-danger-active-text);
}
.base-button--danger:active {
  background-color: var(--nod8-button-danger-active);
  color: var(--nod8-button-danger-active-text);
}

.base-button__icon-left,
.base-button__icon-right {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 0;
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
