<template>
  <div class="base-segmented-select" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      class="base-segmented-select__option"
      :class="{ 'base-segmented-select__option--active': option.value === modelValue }"
      :aria-selected="option.value === modelValue"
      :title="option.label"
      role="tab"
      @click="$emit('update:modelValue', option.value)"
    >
      <LucideIcon v-if="option.icon" :name="option.icon" :size="iconSize" />
      <span v-if="option.label" class="base-segmented-select__label">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

export interface BaseSegmentedSelectOption {
  value: string
  label?: string
  icon?: string
}

withDefaults(
  defineProps<{
    modelValue: string
    options: BaseSegmentedSelectOption[]
    ariaLabel?: string
    iconSize?: number
  }>(),
  {
    ariaLabel: 'Segmented select',
    iconSize: 14,
  },
)

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.base-segmented-select {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: var(--sailor-space-1);
  padding: var(--sailor-space-1);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-base);
}

.base-segmented-select__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-1);
  min-width: 0;
  height: 30px;
  padding: 0 var(--sailor-space-2);
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-medium);
  transition:
    background 120ms var(--sailor-ease-standard),
    color 120ms var(--sailor-ease-standard);
}

.base-segmented-select__option:hover {
  background: var(--sailor-button-ghost-hover);
  color: var(--sailor-text-primary);
}

.base-segmented-select__option--active {
  background: var(--sailor-bg-muted);
  color: var(--sailor-text-primary);
}

.base-segmented-select__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
