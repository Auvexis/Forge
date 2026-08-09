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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseButton, { type ButtonSize, type ButtonVariant } from '@/shared/components/base/BaseButton.vue'
import { ownerDocumentOf } from '@/shared/composables/useOverlayTarget'

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

function handleOutsidePointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target || rootRef.value?.contains(target)) return
  isOpen.value = false
}

onMounted(() => {
  ownerDocumentOf(rootRef.value).addEventListener('pointerdown', handleOutsidePointerDown, true)
})

onBeforeUnmount(() => {
  ownerDocumentOf(rootRef.value).removeEventListener('pointerdown', handleOutsidePointerDown, true)
})
</script>

<style scoped>
.base-dropdown-select {
  position: relative;
  flex: 0 0 auto;
}

.base-dropdown-select__trigger {
  border-radius: var(--fabric-app-dropdown-select-radius);
}

.base-dropdown-select__menu {
  position: absolute;
  right: 0;
  z-index: var(--fabric-z-overlay);
  display: grid;
  width: 190px;
  max-height: 256px;
  gap: 1px;
  overflow-y: auto;
  border: 1px solid var(--fabric-app-dropdown-select-border-strong);
  border-radius: var(--fabric-app-dropdown-select-menu-radius);
  background: var(--fabric-app-dropdown-select-bg-surface);
  padding: 3px;
  box-shadow: none;
}

.base-dropdown-select__menu--up {
  bottom: calc(100% + 4px);
}

.base-dropdown-select__menu--down {
  top: calc(100% + 4px);
}

.base-dropdown-select__option {
  position: relative;
  z-index: 1;
  justify-content: flex-start;
  height: auto;
  min-height: 28px;
  background: transparent;
  padding: 3px 6px;
  text-align: left;
}

.base-dropdown-select__option:hover,
.base-dropdown-select__option:active {
  background: var(--fabric-app-dropdown-select-button-ghost-hover);
  color: var(--fabric-app-dropdown-select-button-ghost-hover-text);
}

.base-dropdown-select__option--active {
  background: var(--fabric-app-dropdown-select-button-ghost-active);
  color: var(--fabric-app-dropdown-select-button-ghost-active-text);
}

.base-dropdown-select__option :deep(.base-button__label) {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--fabric-space-2);
}

.base-dropdown-select__option-meta {
  flex: 0 0 auto;
  color: var(--fabric-app-dropdown-select-text-primary);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
  line-height: 1;
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
  color: var(--fabric-app-dropdown-select-text-primary);
  font-size: var(--fabric-text-xs);
}

.base-dropdown-select__option-copy small {
  color: var(--fabric-app-dropdown-select-text-muted);
  font-size: 10px;
}

.base-dropdown-select-up-enter-active,
.base-dropdown-select-up-leave-active,
.base-dropdown-select-down-enter-active,
.base-dropdown-select-down-leave-active {
  transition:
    opacity var(--fabric-duration-base) var(--fabric-ease-standard),
    transform var(--fabric-duration-base) var(--fabric-ease-standard);
}

.base-dropdown-select-up-enter-from,
.base-dropdown-select-up-leave-to {
  opacity: 0;
  transform: translateY(var(--fabric-space-2));
}

.base-dropdown-select-down-enter-from,
.base-dropdown-select-down-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--fabric-space-2) * -1));
}
</style>
