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
        <BaseWoobyMenu
          v-if="isOpen"
          ref="dropdownRef"
          tag="div"
          position="absolute"
          class="base-select-dropdown"
          active-selector=".base-select-option--selected"
          overflow="auto"
          :style="dropdownStyle"
          @click.stop
        >
          <div 
            v-for="option in options" 
            :key="option.value"
            class="base-select-option"
            :class="{ 'base-select-option--selected': option.value === modelValue }"
            style="position: relative; z-index: 1; background: transparent;"
            @click.stop="selectOption(option)"
          >
            <LucideIcon v-if="option.icon" :name="option.icon" :size="16" class="option-icon text-muted" />
            <img v-else-if="option.image" :src="option.image" class="option-image" />
            <span class="truncate">{{ option.label }}</span>
            <LucideIcon v-if="option.value === modelValue" name="check" :size="14" class="ml-auto text-sailor-accent" />
          </div>
          <div v-if="!options.length" class="base-select-empty" style="position: relative; z-index: 1;">
            No options available
          </div>
        </BaseWoobyMenu>
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
import BaseWoobyMenu from '@/shared/components/base/BaseWoobyMenu.vue'

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
const dropdownRef = ref<InstanceType<typeof BaseWoobyMenu> | null>(null)
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
    zIndex: '10000',
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
  const dropdownEl = dropdownRef.value?.$el as HTMLElement | undefined
  if (
    wrapperRef.value &&
    !wrapperRef.value.contains(target) &&
    !dropdownEl?.contains(target)
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
  gap: var(--sailor-space-1);
  width: 100%;
  position: relative;
}

.base-input-wrapper__label {
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-medium);
  color: var(--sailor-text-secondary);
}

.required {
  color: var(--sailor-text-error);
}

.base-select-container {
  display: flex;
  align-items: center;
  position: relative;
  background-color: var(--sailor-bg-overlay);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  transition: all var(--sailor-duration-fast) var(--sailor-ease-standard);
  width: 100%;
  min-height: 36px;
  cursor: pointer;
  user-select: none;
}

.base-select-container--error {
  border-color: var(--sailor-red-500);
}
.base-select-container--error.base-select-container--open {
  box-shadow: 0 0 0 1px var(--sailor-red-500);
}

.base-select-container--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--sailor-bg-muted);
}

.base-select-trigger {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  width: 100%;
  padding: 0 var(--sailor-space-8) 0 var(--sailor-space-3);
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
}

.placeholder {
  color: var(--sailor-text-muted);
}

.base-select__icon {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sailor-text-secondary);
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
  max-height: 240px;
  overflow-y: auto;
  background-color: var(--sailor-bg-elevated);
  border: 1px solid var(--sailor-border-strong);
  border-radius: var(--sailor-radius-sm);
  box-shadow: var(--sailor-shadow-lg);
  gap: var(--sailor-space-1);
  z-index: 50;
  display: flex;
  flex-direction: column;
  padding: 4px;
}

.base-select-option {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  padding: 8px 12px;
  font-size: var(--sailor-text-sm);
  color: var(--sailor-text-primary);
  border-radius: var(--sailor-radius-sm);
  cursor: pointer;
}

.base-select-empty {
  padding: 12px;
  text-align: center;
  font-size: var(--sailor-text-sm);
  color: var(--sailor-text-muted);
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
  font-size: var(--sailor-text-xs);
  color: var(--sailor-text-error);
  margin-top: 2px;
}

.base-input-wrapper__hint {
  font-size: var(--sailor-text-xs);
  color: var(--sailor-text-muted);
  margin-top: 2px;
}
</style>
