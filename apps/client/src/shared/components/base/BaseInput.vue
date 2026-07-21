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
        ref="inputRef"
        :id="id"
        :type="type"
        v-bind="$attrs"
        class="base-input"
        :class="{ 'has-left-icon': !!iconLeft, 'has-right-icon': !!iconRight }"
        :value="type !== 'file' && type !== 'checkbox' ? modelValue : undefined"
        :checked="type === 'checkbox' ? Boolean(modelValue) : undefined"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        @input="type !== 'file' ? onInput($event) : undefined"
        @change="type === 'file' ? $emit('change', $event) : undefined"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        @dragover.prevent
        @drop="onDrop"
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
import { computed, ref } from 'vue'
import { generateId } from '@/shared/utils/id'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | boolean
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
  'update:modelValue': [value: string | boolean]
  change: [event: Event]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const id = computed(() => props.id || generateId('input'))
const inputRef = ref<HTMLInputElement | null>(null)

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', props.type === 'checkbox' ? target.checked : target.value)
}

const onDrop = (e: DragEvent) => {
  if (props.type === 'file' || props.type === 'checkbox') return
  const token = e.dataTransfer?.getData('text/plain')
  if (!token) return
  const target = e.target as HTMLInputElement
  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? target.value.length
  const nextValue = `${target.value.slice(0, start)}${token}${target.value.slice(end)}`
  emit('update:modelValue', nextValue)
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  select: () => inputRef.value?.select(),
  click: () => inputRef.value?.click(),
})

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
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

.base-input-container {
  display: flex;
  align-items: center;
  position: relative;
  background-color: var(--fabric-input-bg);
  border: 1px solid var(--fabric-input-border);
  border-radius: 2px;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard);
  width: 100%;
}

.base-input-container:hover:not(.base-input-container--disabled) {
  background-color: var(--fabric-bg-surface);
  border-color: var(--fabric-border-muted);
}

.base-input-container:focus-within {
  border-color: var(--fabric-input-border-focus);
  background-color: var(--fabric-bg-surface);
}

.base-input-container--error {
  border-color: var(--fabric-input-error-border);
}
.base-input-container--error:focus-within {
  box-shadow: 0 0 0 1px var(--fabric-input-error-border);
}

.base-input-container--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--fabric-input-disabled-bg);
}

.base-input {
  flex: 1;
  width: 100%;
  height: 26px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--fabric-input-text);
  font-size: 12px;
  padding: 0 8px;
  line-height: 1.2;
}

.base-input::placeholder {
  color: var(--fabric-input-placeholder);
}

.base-input.has-left-icon {
  padding-left: 28px;
}

.base-input.has-right-icon {
  padding-right: 28px;
}

.base-input__icon {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fabric-text-secondary);
  width: 28px;
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
