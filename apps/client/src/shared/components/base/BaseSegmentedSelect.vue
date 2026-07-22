<template>
  <div class="base-segmented-select" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      class="base-segmented-select__option"
      :class="{ 'base-segmented-select__option--active': option.value === modelValue }"
      :aria-selected="option.value === modelValue"
      :title="option.title ?? option.label"
      role="tab"
      @click="$emit('update:modelValue', option.value)"
    >
      <LucideIcon v-if="option.icon" :name="option.icon" :size="iconSize" />
      <span v-else-if="option.emojiIcon" class="base-segmented-select__emoji-icon">
        {{ option.emojiIcon }}
      </span>
      <span v-if="option.label" class="base-segmented-select__label">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

export interface BaseSegmentedSelectOption {
  value: string
  label?: string
  title?: string
  icon?: string
  emojiIcon?: string
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
  gap: 1px;
  padding: 2px;
  border: 1px solid var(--fabric-border-muted);
  border-radius: 2px;
  background: var(--fabric-bg-overlay);
}

.base-segmented-select__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  height: 22px;
  padding: 0 6px;
  border-radius: 2px;
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-medium);
  transition:
    background 120ms var(--fabric-ease-standard),
    color 120ms var(--fabric-ease-standard);
}

.base-segmented-select__option:hover {
  background: var(--fabric-button-ghost-hover);
  color: var(--fabric-text-primary);
}

.base-segmented-select__option--active {
  background: var(--fabric-button-ghost-active);
  box-shadow: inset 0 -1px 0 var(--fabric-accent);
  color: var(--fabric-text-primary);
}

.base-segmented-select__option--active:hover {
  background: var(--fabric-button-ghost-active);
}

.base-segmented-select__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-segmented-select__emoji-icon {
  flex: 0 0 auto;
  line-height: 1;
}
</style>
