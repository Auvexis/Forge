<template>
  <button
    class="base-rail-toggle-item"
    :class="{
      'base-rail-toggle-item--on': modelValue,
      'base-rail-toggle-item--off': !modelValue,
    }"
    type="button"
    :title="title"
    :disabled="disabled"
    @click="$emit('update:modelValue', !modelValue)"
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
    modelValue: boolean
    icon?: string
    iconSize?: number
    title?: string
    disabled?: boolean
  }>(),
  {
    iconSize: 18,
    icon: 'refresh-cw',
    title: undefined,
    disabled: false,
  },
)

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.base-rail-toggle-item {
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

.base-rail-toggle-item:hover:not(:disabled) {
  border-color: transparent;
  background: var(--fabric-workbench-rail-button-hover-bg, var(--fabric-button-ghost-hover));
  color: var(--fabric-workbench-rail-button-hover-text, var(--fabric-text-primary));
}

.base-rail-toggle-item:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.base-rail-toggle-item--on {
  color: var(--fabric-workbench-rail-button-toggle-text, var(--fabric-accent));
}

.base-rail-toggle-item--on::after,
.base-rail-toggle-item--off::after {
  position: absolute;
  right: 5px;
  bottom: 5px;
  width: 10px;
  height: 5px;
  border: 1px solid currentColor;
  border-radius: 999px;
  content: '';
}

.base-rail-toggle-item--on::before {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: currentColor;
  content: '';
}

.base-rail-toggle-item--off::after {
  opacity: 0.42;
}
</style>
