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
  border-radius: var(--fabric-base-rail-item-radius);
  background: var(--fabric-base-rail-item-workbench-rail-button-bg);
  color: var(--fabric-base-rail-item-workbench-rail-button-text);
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.base-rail-item:hover:not(:disabled),
.base-rail-item--active {
  border-color: transparent;
  background: var(--fabric-base-rail-item-workbench-rail-button-hover-bg);
  color: var(--fabric-base-rail-item-workbench-rail-button-hover-text);
}

.base-rail-item--active::before {
  position: absolute;
  left: 0;
  width: 2px;
  height: 22px;
  border-radius: var(--fabric-base-rail-item-active-radius);
  background: var(--fabric-base-rail-item-workbench-rail-button-active-indicator);
  content: '';
}

.base-rail-item:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.base-rail-item--primary {
  color: var(--fabric-base-rail-item-workbench-rail-button-primary-text);
}

.base-rail-item--run {
  color: var(--fabric-base-rail-item-workbench-rail-button-run-text);
}

.base-rail-item--danger {
  color: var(--fabric-base-rail-item-workbench-rail-button-danger-text);
}

.base-rail-item--dirty::after {
  position: absolute;
  top: 6px;
  right: 7px;
  width: 6px;
  height: 6px;
  border-radius: var(--fabric-base-rail-item-badge-radius);
  background: var(--fabric-base-rail-item-workbench-rail-button-dirty-indicator);
  content: '';
}

</style>
