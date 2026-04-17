<template>
  <div class="base-select-wrapper">
    <label v-if="label" :for="id" class="base-input-wrapper__label">
      {{ label }} <span v-if="required" class="required">*</span>
    </label>

    <div
      class="base-select-container"
      :class="{
        'base-select-container--error': !!error,
        'base-select-container--disabled': disabled,
      }"
    >
      <select
        :id="id"
        :value="modelValue"
        class="base-select"
        :disabled="disabled"
        :required="required"
        @change="onChange"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        v-bind="$attrs"
      >
        <option v-if="placeholder && !modelValue" value="" disabled selected hidden>
          {{ placeholder }}
        </option>
        <slot>
          <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </slot>
      </select>

      <span class="base-select__icon">
        <LucideIcon name="chevron-down" :size="16" />
      </span>
    </div>

    <p v-if="error" class="base-input-wrapper__error">{{ error }}</p>
    <p v-else-if="hint" class="base-input-wrapper__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { generateId } from '@/shared/utils/id'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

export interface SelectOption {
  value: string | number
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number
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
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const id = computed(() => props.id || generateId('select'))

const onChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
  width: 100%;
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
}

.base-select-container:focus-within {
  border-color: var(--nod8-accent);
  box-shadow: 0 0 0 1px var(--nod8-accent);
}

.base-select-container--error {
  border-color: var(--nod8-red-500);
}
.base-select-container--error:focus-within {
  box-shadow: 0 0 0 1px var(--nod8-red-500);
}

.base-select-container--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--nod8-bg-muted);
}

.base-select {
  flex: 1;
  width: 100%;
  height: 36px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--nod8-text-primary);
  font-size: var(--nod8-text-sm);
  padding: 0 var(--nod8-space-8) 0 var(--nod8-space-3);
  appearance: none;
  cursor: pointer;
}

.base-select:disabled {
  cursor: not-allowed;
  color: var(--nod8-text-disabled);
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

/* Base Select Options Styling in some browsers can be limited, 
but inheriting background provides a better default */
.base-select option {
  background-color: var(--nod8-bg-surface);
  color: var(--nod8-text-primary);
}
</style>
