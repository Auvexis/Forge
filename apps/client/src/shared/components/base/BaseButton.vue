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
  gap: 6px;
  border-radius: 2px;
  font-family: inherit;
  font-weight: var(--fabric-font-medium);
  line-height: 1;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
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
  height: 24px;
  padding: 0 8px;
  font-size: var(--fabric-text-xs);
}

.base-button--md {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
}

.base-button--lg {
  height: 34px;
  padding: 0 14px;
  font-size: 13px;
}

.base-button--icon {
  width: 28px;
  height: 28px;
  padding: 0;
}

.base-button--checkbox {
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 2px;
  font-size: var(--fabric-text-xs);
}

/* ── Variants ──────────────────────────────────── */
/* Primary */
.base-button--primary {
  background-color: var(--fabric-button-primary-bg);
  color: var(--fabric-button-primary-text);
  border: 1px solid var(--fabric-button-primary-border);
}
.base-button--primary:hover {
  background-color: var(--fabric-button-primary-hover);
  color: var(--fabric-button-primary-text);
}
.base-button--primary:active {
  background-color: var(--fabric-button-primary-active);
  color: var(--fabric-button-primary-active-text);
}

/* Secondary */
.base-button--secondary {
  background-color: var(--fabric-button-secondary-bg);
  color: var(--fabric-button-secondary-text);
  border: 1px solid var(--fabric-button-secondary-border);
}
.base-button--secondary:hover {
  background-color: var(--fabric-button-secondary-hover);
  color: var(--fabric-button-secondary-text);
}
.base-button--secondary:active {
  background-color: var(--fabric-button-secondary-active);
  color: var(--fabric-button-secondary-active-text);
}

/* Outline */
.base-button--outline {
  background-color: var(--fabric-button-outline-bg);
  color: var(--fabric-button-outline-text);
  border: 1px solid var(--fabric-button-outline-border);
}
.base-button--outline:hover {
  background-color: var(--fabric-button-outline-hover);
  color: var(--fabric-button-outline-text);
}
.base-button--outline:active {
  background-color: var(--fabric-button-outline-active);
  color: var(--fabric-button-outline-active-text);
}

/* Ghost */
.base-button--ghost {
  background-color: var(--fabric-button-ghost-bg);
  color: var(--fabric-button-ghost-text);
  border: 1px solid transparent;
}
.base-button--ghost:hover {
  background-color: var(--fabric-button-ghost-hover);
  color: var(--fabric-button-ghost-text);
  border-color: var(--fabric-border-muted);
}
.base-button--ghost:active {
  background-color: var(--fabric-button-ghost-active);
  color: var(--fabric-button-ghost-active-text);
}

/* Danger */
.base-button--danger {
  background-color: var(--fabric-button-danger-bg);
  color: var(--fabric-button-danger-text);
  border: 1px solid var(--fabric-button-danger-border);
}
.base-button--danger:hover {
  background-color: var(--fabric-button-danger-hover);
  color: var(--fabric-button-danger-active-text);
}
.base-button--danger:active {
  background-color: var(--fabric-button-danger-active);
  color: var(--fabric-button-danger-active-text);
}

/* Dashed */
.base-button--dashed {
  background-color: var(--fabric-button-outline-bg);
  color: var(--fabric-button-outline-text);
  border: 1px dashed var(--fabric-button-outline-border);
}
.base-button--dashed:hover {
  background-color: var(--fabric-button-outline-hover);
  color: var(--fabric-button-outline-text);
}
.base-button--dashed:active {
  background-color: var(--fabric-button-outline-active);
  color: var(--fabric-button-outline-active-text);
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
