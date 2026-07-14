<template>
  <button
    class="base-rail-item"
    :class="[
      tone ? `base-rail-item--${tone}` : null,
      {
        'base-rail-item--active': active,
        'base-rail-item--dirty': dirty,
      },
    ]"
    type="button"
    :title="title"
    :disabled="disabled"
  >
    <slot>
      <LucideIcon v-if="icon" :name="icon" :size="iconSize" />
    </slot>
  </button>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(
  defineProps<{
    icon?: string
    iconSize?: number
    title?: string
    disabled?: boolean
    active?: boolean
    dirty?: boolean
    tone?: 'primary' | 'run' | 'danger' | null
  }>(),
  {
    iconSize: 18,
    title: undefined,
    disabled: false,
    active: false,
    dirty: false,
    tone: null,
  },
)
</script>

<style scoped>
.base-rail-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--fabric-base-rail-item-width, 100%);
  height: var(--fabric-base-rail-item-height, 36px);
  border: 1px solid transparent;
  border-radius: 0;
  background: var(--fabric-workbench-rail-button-bg, transparent);
  color: var(--fabric-workbench-rail-button-text, var(--fabric-text-muted));
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.base-rail-item:hover:not(:disabled),
.base-rail-item--active {
  border-color: transparent;
  background: var(--fabric-workbench-rail-button-hover-bg, var(--fabric-button-ghost-hover));
  color: var(--fabric-workbench-rail-button-hover-text, var(--fabric-text-primary));
}

.base-rail-item--active::before {
  position: absolute;
  left: 0;
  width: 2px;
  height: 22px;
  border-radius: 0 999px 999px 0;
  background: var(--fabric-workbench-rail-button-active-indicator, var(--fabric-accent));
  content: '';
}

.base-rail-item:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.base-rail-item--primary {
  color: var(--fabric-workbench-rail-button-primary-text, var(--fabric-accent));
}

.base-rail-item--run {
  color: var(--fabric-workbench-rail-button-run-text, var(--fabric-green-500));
}

.base-rail-item--danger {
  color: var(--fabric-workbench-rail-button-danger-text, var(--fabric-red-500));
}

.base-rail-item--dirty::after {
  position: absolute;
  top: 6px;
  right: 7px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--fabric-workbench-rail-button-dirty-indicator, var(--fabric-amber-500));
  content: '';
}

</style>
