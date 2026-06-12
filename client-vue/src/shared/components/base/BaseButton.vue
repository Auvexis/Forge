<template>
  <AppHint v-if="hint" :hint="hint">
    <button
      :class="buttonClass"
      :disabled="disabled || loading"
      v-bind="$attrs"
    >
      <span v-if="loading" class="base-button__icon-left">
        <LucideIcon name="loader-2" class="spin" :size="iconSize" />
      </span>
      <span v-else-if="iconLeft || $slots.left" class="base-button__icon-left">
        <slot name="left">
          <LucideIcon v-if="iconLeft" :name="iconLeft" :size="iconSize" />
        </slot>
      </span>

      <span v-if="$slots.default" class="base-button__label">
        <slot />
      </span>

      <span v-if="(iconRight || $slots.right) && !loading" class="base-button__icon-right">
        <slot name="right">
          <LucideIcon v-if="iconRight" :name="iconRight" :size="iconSize" />
        </slot>
      </span>
    </button>
  </AppHint>

  <button
    v-else
    :class="buttonClass"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <span v-if="loading" class="base-button__icon-left">
      <LucideIcon name="loader-2" class="spin" :size="iconSize" />
    </span>
    <span v-else-if="iconLeft || $slots.left" class="base-button__icon-left">
      <slot name="left">
        <LucideIcon v-if="iconLeft" :name="iconLeft" :size="iconSize" />
      </slot>
    </span>

    <span v-if="$slots.default" class="base-button__label">
      <slot />
    </span>

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
import AppHint from '@/shared/components/hints/AppHint.vue'
import type { ButtonHint } from '@/shared/components/hints/AppHint.types'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dashed'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'checkbox'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    disabled?: boolean
    loading?: boolean
    fullWidth?: boolean
    iconLeft?: string
    iconRight?: string
    hint?: ButtonHint
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    disabled: false,
    loading: false,
    fullWidth: false,
  },
)

const buttonClass = computed(() => [
  'base-button',
  `base-button--${props.variant}`,
  `base-button--${props.size}`,
  { 'base-button--full': props.fullWidth },
])

const iconSize = computed(() => {
  if (props.size === 'sm') return 14
  if (props.size === 'lg') return 20
  if (props.size === 'checkbox') return 13
  return 16
})

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-2);
  border-radius: var(--sailor-radius-sm);
  font-family: inherit;
  font-weight: var(--sailor-font-medium);
  transition: all var(--sailor-duration-fast) var(--sailor-ease-standard);
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
  padding: 0 var(--sailor-space-3);
  font-size: var(--sailor-text-xs);
}

.base-button--md {
  height: 36px;
  padding: 0 var(--sailor-space-4);
  font-size: var(--sailor-text-sm);
}

.base-button--lg {
  height: 44px;
  padding: 0 var(--sailor-space-6);
  font-size: var(--sailor-text-base);
}

.base-button--icon {
  width: 36px;
  height: 36px;
  padding: 0;
}

.base-button--checkbox {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: var(--sailor-radius-sm);
  font-size: var(--sailor-text-xs);
}

/* ── Variants ──────────────────────────────────── */
/* Primary */
.base-button--primary {
  background-color: var(--sailor-button-primary-bg);
  color: var(--sailor-button-primary-text);
  border: 1px solid var(--sailor-button-primary-border);
}
.base-button--primary:hover {
  background-color: var(--sailor-button-primary-hover);
  color: var(--sailor-button-primary-text);
}
.base-button--primary:active {
  background-color: var(--sailor-button-primary-active);
  color: var(--sailor-button-primary-active-text);
}

/* Secondary */
.base-button--secondary {
  background-color: var(--sailor-button-secondary-bg);
  color: var(--sailor-button-secondary-text);
  border: 1px solid var(--sailor-button-secondary-border);
}
.base-button--secondary:hover {
  background-color: var(--sailor-button-secondary-hover);
  color: var(--sailor-button-secondary-text);
}
.base-button--secondary:active {
  background-color: var(--sailor-button-secondary-active);
  color: var(--sailor-button-secondary-active-text);
}

/* Outline */
.base-button--outline {
  background-color: var(--sailor-button-outline-bg);
  color: var(--sailor-button-outline-text);
  border: 1px solid var(--sailor-button-outline-border);
}
.base-button--outline:hover {
  background-color: var(--sailor-button-outline-hover);
  color: var(--sailor-button-outline-text);
}
.base-button--outline:active {
  background-color: var(--sailor-button-outline-active);
  color: var(--sailor-button-outline-active-text);
}

/* Ghost */
.base-button--ghost {
  background-color: var(--sailor-button-ghost-bg);
  color: var(--sailor-button-ghost-text);
  border: 1px solid transparent;
}
.base-button--ghost:hover {
  background-color: var(--sailor-button-ghost-hover);
  color: var(--sailor-button-ghost-text);
  border-color: transparent;
}
.base-button--ghost:active {
  background-color: var(--sailor-button-ghost-active);
  color: var(--sailor-button-ghost-active-text);
}

/* Danger */
.base-button--danger {
  background-color: var(--sailor-button-danger-bg);
  color: var(--sailor-button-danger-text);
  border: 1px solid var(--sailor-button-danger-border);
}
.base-button--danger:hover {
  background-color: var(--sailor-button-danger-hover);
  color: var(--sailor-button-danger-active-text);
}
.base-button--danger:active {
  background-color: var(--sailor-button-danger-active);
  color: var(--sailor-button-danger-active-text);
}

/* Dashed */
.base-button--dashed {
  background-color: var(--sailor-button-outline-bg);
  color: var(--sailor-button-outline-text);
  border: 1px dashed var(--sailor-button-outline-border);
}
.base-button--dashed:hover {
  background-color: var(--sailor-button-outline-hover);
  color: var(--sailor-button-outline-text);
}
.base-button--dashed:active {
  background-color: var(--sailor-button-outline-active);
  color: var(--sailor-button-outline-active-text);
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
