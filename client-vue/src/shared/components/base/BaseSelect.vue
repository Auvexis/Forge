<template>
  <div class="base-select-wrapper" ref="wrapperRef">
    <label v-if="label" :for="id" class="base-input-wrapper__label">
      {{ label }} <span v-if="required" class="required">*</span>
    </label>

    <div
      class="base-select-container"
      :class="{
        'base-select-container--error': !!error,
        'base-select-container--disabled': disabled,
        'base-select-container--open': isOpen
      }"
      @click="toggleDropdown"
      tabindex="0"
    >
      <!-- Trigger -->
      <div class="base-select-trigger">
        <template v-if="selectedOption">
          <LucideIcon v-if="selectedOption.icon" :name="selectedOption.icon" :size="16" class="option-icon text-muted" />
          <img v-else-if="selectedOption.image" :src="selectedOption.image" class="option-image" />
          <span class="truncate">{{ selectedOption.label }}</span>
        </template>
        <span v-else class="placeholder">{{ placeholder || 'Select...' }}</span>
      </div>

      <!-- Arrow -->
      <span class="base-select__icon" :class="{ 'rotate-180': isOpen }">
        <LucideIcon name="chevron-down" :size="16" />
      </span>

      <!-- Dropdown -->
      <Transition name="fade-down">
        <div v-if="isOpen" class="base-select-dropdown">
          <div 
            v-for="option in options" 
            :key="option.value"
            class="base-select-option"
            :class="{ 'base-select-option--selected': option.value === modelValue }"
            @click.stop="selectOption(option)"
          >
            <LucideIcon v-if="option.icon" :name="option.icon" :size="16" class="option-icon text-muted" />
            <img v-else-if="option.image" :src="option.image" class="option-image" />
            <span class="truncate">{{ option.label }}</span>
            <LucideIcon v-if="option.value === modelValue" name="check" :size="14" class="ml-auto text-nod8-accent" />
          </div>
          <div v-if="!options.length" class="base-select-empty">
            No options available
          </div>
        </div>
      </Transition>
    </div>

    <p v-if="error" class="base-input-wrapper__error">{{ error }}</p>
    <p v-else-if="hint" class="base-input-wrapper__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { generateId } from '@/shared/utils/id'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

export interface SelectOption {
  value: string | number
  label: string
  icon?: string
  image?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null
    options?: SelectOption[]
    label?: string
    placeholder?: string
    error?: string
    hint?: string
    disabled?: boolean
    required?: boolean
    id?: string
  }>(),
  {
    disabled: false,
    required: false,
    options: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const id = computed(() => props.id || generateId('select'))

const isOpen = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)

const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue)
})

const toggleDropdown = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const selectOption = (option: SelectOption) => {
  emit('update:modelValue', option.value)
  closeDropdown()
}

const handleClickOutside = (e: MouseEvent) => {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
  width: 100%;
  position: relative;
}

.base-input-wrapper__label {
  font-size: var(--nod8-text-xs);
  font-weight: var(--nod8-font-medium);
  color: var(--nod8-text-secondary);
}

.required {
  color: var(--nod8-text-error);
}

.base-select-container {
  display: flex;
  align-items: center;
  position: relative;
  background-color: var(--nod8-bg-overlay);
  border: 1px solid var(--nod8-border-strong);
  border-radius: var(--nod8-radius-sm);
  transition: all var(--nod8-duration-fast) var(--nod8-ease-standard);
  width: 100%;
  min-height: 36px;
  cursor: pointer;
  user-select: none;
}

.base-select-container:focus,
.base-select-container--open {
  border-color: var(--nod8-accent);
  box-shadow: 0 0 0 1px var(--nod8-accent);
  outline: none;
}

.base-select-container--error {
  border-color: var(--nod8-red-500);
}
.base-select-container--error.base-select-container--open {
  box-shadow: 0 0 0 1px var(--nod8-red-500);
}

.base-select-container--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--nod8-bg-muted);
}

.base-select-trigger {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  width: 100%;
  padding: 0 var(--nod8-space-8) 0 var(--nod8-space-3);
  color: var(--nod8-text-primary);
  font-size: var(--nod8-text-sm);
}

.placeholder {
  color: var(--nod8-text-muted);
}

.base-select__icon {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nod8-text-secondary);
  width: 36px;
  height: 100%;
  pointer-events: none;
  transition: transform 0.2s ease;
}

.base-select__icon.rotate-180 {
  transform: rotate(180deg);
}

/* Dropdown Menu */
.base-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  max-height: 240px;
  overflow-y: auto;
  background-color: var(--nod8-bg-elevated);
  border: 1px solid var(--nod8-border-strong);
  border-radius: var(--nod8-radius-sm);
  box-shadow: var(--nod8-shadow-lg);
  z-index: 50;
  display: flex;
  flex-direction: column;
  padding: 4px;
}

.base-select-option {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: 8px 12px;
  font-size: var(--nod8-text-sm);
  color: var(--nod8-text-primary);
  border-radius: var(--nod8-radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.base-select-option:hover {
  background-color: var(--nod8-bg-overlay);
}

.base-select-option--selected {
  background-color: var(--nod8-accent-subtle);
}

.base-select-empty {
  padding: 12px;
  text-align: center;
  font-size: var(--nod8-text-sm);
  color: var(--nod8-text-muted);
}

/* Icons & Images */
.option-icon {
  flex-shrink: 0;
}

.option-image {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
}

/* Transition */
.fade-down-enter-active,
.fade-down-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.base-input-wrapper__error {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-error);
  margin-top: 2px;
}

.base-input-wrapper__hint {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  margin-top: 2px;
}
</style>
