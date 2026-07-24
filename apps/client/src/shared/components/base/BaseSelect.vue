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

    </div>

    <Teleport to="body">
      <Transition name="fade-down">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="base-select-dropdown"
          :style="dropdownStyle"
          @click.stop
        >
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
            <LucideIcon v-if="option.value === modelValue" name="check" :size="14" class="ml-auto text-fabric-accent" />
          </div>
          <div v-if="!options.length" class="base-select-empty" style="position: relative; z-index: 1;">
            No options available
          </div>
        </div>
      </Transition>
    </Teleport>

    <p v-if="error" class="base-input-wrapper__error">{{ error }}</p>
    <p v-else-if="hint" class="base-input-wrapper__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, onMounted, onUnmounted } from 'vue'
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
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue)
})

function updateDropdownPosition() {
  const wrapper = wrapperRef.value
  if (!wrapper) return

  const rect = wrapper.getBoundingClientRect()
  const viewportGap = 8
  const preferredMaxHeight = 240
  
  const spaceBelow = window.innerHeight - rect.bottom - viewportGap
  const spaceAbove = rect.top - viewportGap

  const openUp = spaceBelow < preferredMaxHeight && spaceAbove > spaceBelow

  const availableHeight = openUp ? spaceAbove : spaceBelow

  dropdownStyle.value = {
    position: 'fixed',
    top: openUp ? 'auto' : `${rect.bottom + 5}px`,
    bottom: openUp ? `${window.innerHeight - rect.top + 5}px` : 'auto',
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${Math.min(preferredMaxHeight, availableHeight)}px`,
    zIndex: '2147483400',
  }
}

const toggleDropdown = async () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    await nextTick()
    updateDropdownPosition()
  }
}

const closeDropdown = () => {
  isOpen.value = false
}

const selectOption = (option: SelectOption) => {
  emit('update:modelValue', option.value)
  closeDropdown()
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as Node
  if (
    wrapperRef.value &&
    !wrapperRef.value.contains(target) &&
    !dropdownRef.value?.contains(target)
  ) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', updateDropdownPosition)
  window.addEventListener('scroll', updateDropdownPosition, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', updateDropdownPosition)
  window.removeEventListener('scroll', updateDropdownPosition, true)
})

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  position: relative;
}

.base-input-wrapper__label {
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-medium);
  color: var(--fabric-text-secondary);
  line-height: 1.1;
}

.required {
  color: var(--fabric-text-error);
}

.base-select-container {
  display: flex;
  align-items: center;
  position: relative;
  background-color: var(--fabric-bg-overlay);
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-base-select-radius);
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard);
  width: 100%;
  min-height: 26px;
  cursor: pointer;
  user-select: none;
}

.base-select-container:hover:not(.base-select-container--disabled) {
  background-color: var(--fabric-bg-surface);
  border-color: var(--fabric-border-muted);
}

.base-select-container:focus {
  border-color: var(--fabric-border-brand);
}

.base-select-container--error {
  border-color: var(--fabric-red-500);
}

.base-select-container--open {
  background-color: var(--fabric-bg-surface);
  border-color: var(--fabric-border-brand);
}

.base-select-container--error.base-select-container--open {
  box-shadow: 0 0 0 1px var(--fabric-red-500);
}

.base-select-container--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--fabric-bg-muted);
}

.base-select-trigger {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 24px;
  padding: 0 28px 0 8px;
  color: var(--fabric-text-primary);
  font-size: 12px;
}

.placeholder {
  color: var(--fabric-text-muted);
}

.base-select__icon {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fabric-text-secondary);
  width: 28px;
  height: 100%;
  pointer-events: none;
  transition: transform var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.base-select__icon.rotate-180 {
  transform: rotate(180deg);
}

/* Dropdown Menu */
.base-select-dropdown {
  max-height: 240px;
  overflow-y: auto;
  background-color: var(--fabric-bg-surface);
  border: 1px solid var(--fabric-border-strong);
  border-radius: var(--fabric-base-select-menu-radius);
  box-shadow: none;
  gap: 1px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  padding: 3px;
}

.base-select-option {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--fabric-text-primary);
  border-radius: var(--fabric-base-select-option-radius);
  background: transparent;
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.base-select-option:hover {
  background: var(--fabric-button-ghost-hover);
  color: var(--fabric-button-ghost-hover-text);
}

.base-select-option--selected {
  background: var(--fabric-button-ghost-active);
  color: var(--fabric-button-ghost-active-text);
}

.base-select-empty {
  padding: 8px;
  text-align: center;
  font-size: var(--fabric-text-xs);
  color: var(--fabric-text-muted);
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
  font-size: var(--fabric-text-xs);
  color: var(--fabric-text-error);
  margin-top: 2px;
}

.base-input-wrapper__hint {
  font-size: var(--fabric-text-xs);
  color: var(--fabric-text-muted);
  margin-top: 2px;
}
</style>
