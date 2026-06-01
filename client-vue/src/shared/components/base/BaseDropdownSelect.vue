<template>
  <div ref="rootRef" class="base-dropdown-select">
    <BaseButton
      type="button"
      class="base-dropdown-select__trigger"
      :class="triggerClass"
      :variant="variant"
      :size="size"
      :icon-left="iconLeft"
      :icon-right="isOpen ? closeIcon : openIcon"
      :disabled="disabled"
      :title="title || selectedOption?.label"
      @click="toggle"
    >
      <slot name="trigger" :option="selectedOption">
        {{ selectedOption?.shortLabel ?? selectedOption?.label ?? placeholder }}
      </slot>
    </BaseButton>

    <Transition :name="transitionName">
      <div
        v-if="isOpen"
        class="base-dropdown-select__menu"
        :class="[
          `base-dropdown-select__menu--${direction}`,
          menuClass,
        ]"
        role="menu"
      >
        <BaseButton
          v-for="option in options"
          :key="option.value"
          type="button"
          class="base-dropdown-select__option"
          :class="{ 'base-dropdown-select__option--active': option.value === modelValue }"
          variant="ghost"
          full-width
          @click="selectOption(option.value)"
        >
          <slot name="option" :option="option" :selected="option.value === modelValue">
            <span v-if="option.meta" class="base-dropdown-select__option-meta">{{ option.meta }}</span>
            <span class="base-dropdown-select__option-copy">
              <strong>{{ option.label }}</strong>
              <small v-if="option.description">{{ option.description }}</small>
            </span>
          </slot>
        </BaseButton>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import BaseButton, { type ButtonSize, type ButtonVariant } from '@/shared/components/base/BaseButton.vue'

export type BaseDropdownSelectOption = {
  value: string
  label: string
  shortLabel?: string
  description?: string
  meta?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: BaseDropdownSelectOption[]
    placeholder?: string
    title?: string
    disabled?: boolean
    variant?: ButtonVariant
    size?: ButtonSize
    iconLeft?: string
    openIcon?: string
    closeIcon?: string
    direction?: 'up' | 'down'
    triggerClass?: string
    menuClass?: string
  }>(),
  {
    placeholder: 'Select',
    title: '',
    disabled: false,
    variant: 'outline',
    size: 'sm',
    iconLeft: '',
    openIcon: 'chevron-up',
    closeIcon: 'chevron-down',
    direction: 'up',
    triggerClass: '',
    menuClass: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const selectedOption = computed(() =>
  props.options.find((option) => option.value === props.modelValue) ?? props.options[0] ?? null,
)
const transitionName = computed(() =>
  props.direction === 'up' ? 'base-dropdown-select-up' : 'base-dropdown-select-down',
)

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function selectOption(value: string) {
  emit('update:modelValue', value)
  isOpen.value = false
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as Node | null
  if (!target || rootRef.value?.contains(target)) return
  isOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<style scoped>
.base-dropdown-select {
  position: relative;
  flex: 0 0 auto;
}

.base-dropdown-select__trigger {
  border-radius: var(--sailor-radius-full);
}

.base-dropdown-select__menu {
  position: absolute;
  right: 0;
  z-index: var(--sailor-z-overlay);
  display: grid;
  width: 190px;
  max-height: 256px;
  gap: var(--sailor-space-1);
  overflow-y: auto;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-lg);
  background: var(--sailor-bg-surface);
  padding: var(--sailor-space-2);
  box-shadow: var(--sailor-shadow-lg);
}

.base-dropdown-select__menu--up {
  bottom: calc(100% + var(--sailor-space-2));
}

.base-dropdown-select__menu--down {
  top: calc(100% + var(--sailor-space-2));
}

.base-dropdown-select__option {
  justify-content: flex-start;
  height: auto;
  min-height: 38px;
  padding-block: var(--sailor-space-2);
  text-align: left;
}

.base-dropdown-select__option :deep(.base-button__label) {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--sailor-space-2);
}

.base-dropdown-select__option-meta {
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-semibold);
}

.base-dropdown-select__option-copy {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.base-dropdown-select__option-copy strong,
.base-dropdown-select__option-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-dropdown-select__option-copy strong {
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-xs);
}

.base-dropdown-select__option-copy small {
  color: var(--sailor-text-muted);
  font-size: 10px;
}

.base-dropdown-select__option--active {
  background: var(--sailor-button-ghost-hover);
}

.base-dropdown-select-up-enter-active,
.base-dropdown-select-up-leave-active,
.base-dropdown-select-down-enter-active,
.base-dropdown-select-down-leave-active {
  transition:
    opacity var(--sailor-duration-base) var(--sailor-ease-standard),
    transform var(--sailor-duration-base) var(--sailor-ease-standard);
}

.base-dropdown-select-up-enter-from,
.base-dropdown-select-up-leave-to {
  opacity: 0;
  transform: translateY(var(--sailor-space-2));
}

.base-dropdown-select-down-enter-from,
.base-dropdown-select-down-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--sailor-space-2) * -1));
}
</style>
