<template>
  <div class="base-input-wrapper">
    <label v-if="label" :for="id" class="base-input-wrapper__label">
      {{ label }} <span v-if="required" class="required">*</span>
    </label>

    <div
      class="base-input-container"
      :class="{
        'base-input-container--error': !!error,
        'base-input-container--disabled': disabled,
      }"
    >
      <span v-if="iconLeft" class="base-input__icon base-input__icon--left">
        <LucideIcon :name="iconLeft" :size="16" />
      </span>

      <input
        :id="id"
        :type="type"
        :value="modelValue"
        class="base-input"
        :class="{ 'has-left-icon': !!iconLeft, 'has-right-icon': !!iconRight }"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        @input="onInput"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        v-bind="$attrs"
      />

      <span v-if="iconRight" class="base-input__icon base-input__icon--right">
        <LucideIcon :name="iconRight" :size="16" />
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

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    type?: string
    label?: string
    placeholder?: string
    error?: string
    hint?: string
    disabled?: boolean
    required?: boolean
    iconLeft?: string
    iconRight?: string
    id?: string
  }>(),
  {
    type: 'text',
    disabled: false,
    required: false,
    modelValue: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const id = computed(() => props.id || generateId('input'))

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-input-wrapper {
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

.base-input-container {
  display: flex;
  align-items: center;
  position: relative;
  background-color: var(--nod8-gray-900);
  border: 1px solid var(--nod8-border-muted);
  border-radius: var(--nod8-radius-sm);
  transition: all var(--nod8-duration-fast) var(--nod8-ease-standard);
  width: 100%;
}

.base-input-container--error {
  border-color: var(--nod8-red-500);
}
.base-input-container--error:focus-within {
  box-shadow: 0 0 0 1px var(--nod8-red-500);
}

.base-input-container--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--nod8-bg-muted);
}

.base-input {
  flex: 1;
  width: 100%;
  height: 36px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--nod8-text-primary);
  font-size: var(--nod8-text-sm);
  padding: 0 var(--nod8-space-3);
}

.base-input::placeholder {
  color: var(--nod8-text-disabled);
}

.base-input.has-left-icon {
  padding-left: 36px;
}

.base-input.has-right-icon {
  padding-right: 36px;
}

.base-input__icon {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nod8-text-secondary);
  width: 36px;
  height: 100%;
  pointer-events: none;
}

.base-input__icon--left {
  left: 0;
}
.base-input__icon--right {
  right: 0;
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
