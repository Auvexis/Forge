<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { generateId } from '@/shared/utils/id'
import BaseButton from './BaseButton.vue'
import { insertDroppedText } from './baseVariableInput'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | boolean
    fieldType?: 'input' | 'textarea'
    type?: string
    label?: string
    placeholder?: string
    error?: string
    hint?: string
    disabled?: boolean
    required?: boolean
    rows?: number
    iconLeft?: string
    iconRight?: string
    id?: string
    showVariableButton?: boolean
    variableButtonTitle?: string
  }>(),
  {
    fieldType: 'input',
    type: 'text',
    disabled: false,
    required: false,
    rows: 4,
    modelValue: '',
    showVariableButton: true,
    variableButtonTitle: 'Insert variable',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | boolean]
  change: [event: Event]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
  'variable-click': [event: MouseEvent]
}>()

const attrs = useAttrs()
const id = computed(() => props.id || generateId(`variable-${props.fieldType}`))
const fieldRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
const hasVariableAction = computed(
  () =>
    props.showVariableButton &&
    (props.fieldType === 'textarea' || (props.type !== 'file' && props.type !== 'checkbox')),
)
const rootAttrs = computed(() => ({
  class: attrs.class,
  style: attrs.style,
}))
const fieldAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  emit(
    'update:modelValue',
    props.fieldType === 'input' && props.type === 'checkbox'
      ? (target as HTMLInputElement).checked
      : target.value,
  )
}

const onDrop = (event: DragEvent) => {
  if (!hasVariableAction.value) return
  event.preventDefault()
  event.stopPropagation()
  const token = event.dataTransfer?.getData('text/plain')
  if (!token) return
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  const nextValue = insertDroppedText(target.value, token, target.selectionStart, target.selectionEnd)
  emit('update:modelValue', nextValue)
}

defineExpose({
  focus: () => fieldRef.value?.focus(),
  select: () => fieldRef.value?.select(),
  click: () => fieldRef.value?.click(),
})

defineOptions({ inheritAttrs: false })
</script>

<template>
  <div class="base-variable-input-wrapper" v-bind="rootAttrs">
    <label v-if="label" :for="id" class="base-variable-input-wrapper__label">
      {{ label }} <span v-if="required" class="required">*</span>
    </label>

    <div
      class="base-variable-input-container"
      :class="{
        'base-variable-input-container--error': !!error,
        'base-variable-input-container--disabled': disabled,
      }"
    >
      <span v-if="iconLeft" class="base-variable-input__icon base-variable-input__icon--left">
        <LucideIcon :name="iconLeft" :size="16" />
      </span>

      <input
        v-if="fieldType === 'input'"
        :id="id"
        ref="fieldRef"
        :type="type"
        v-bind="fieldAttrs"
        class="base-variable-input"
        :class="{
          'has-left-icon': !!iconLeft,
          'has-right-icon': !!iconRight,
          'has-variable-action': hasVariableAction,
        }"
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
        @drop.prevent.stop="onDrop"
      />

      <textarea
        v-else
        :id="id"
        ref="fieldRef"
        v-bind="fieldAttrs"
        class="base-variable-input base-variable-input--textarea has-variable-action"
        :value="String(modelValue ?? '')"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :rows="rows"
        @input="onInput"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        @dragover.prevent
        @drop.prevent.stop="onDrop"
      ></textarea>

      <span v-if="iconRight" class="base-variable-input__icon base-variable-input__icon--right">
        <LucideIcon :name="iconRight" :size="16" />
      </span>

      <BaseButton
        v-if="hasVariableAction"
        class="base-variable-input__button"
        size="icon"
        variant="ghost"
        type="button"
        :title="variableButtonTitle"
        :disabled="disabled"
        icon-left="braces"
        @click.stop="$emit('variable-click', $event)"
      />
    </div>

    <p v-if="error" class="base-variable-input-wrapper__error">{{ error }}</p>
    <p v-else-if="hint" class="base-variable-input-wrapper__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.base-variable-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
  width: 100%;
}

.base-variable-input-wrapper__label {
  font-size: var(--nod8-text-xs);
  font-weight: var(--nod8-font-medium);
  color: var(--nod8-text-secondary);
}

.required {
  color: var(--nod8-text-error);
}

.base-variable-input-container {
  display: flex;
  align-items: center;
  position: relative;
  background-color: var(--nod8-input-bg);
  border: 1px solid var(--nod8-input-border);
  border-radius: var(--nod8-radius-sm, 6px);
  transition: all var(--nod8-duration-fast) var(--nod8-ease-standard);
  width: 100%;
}

.base-variable-input-container:focus-within {
  border-color: var(--nod8-input-border-focus);
}

.base-variable-input-container--error {
  border-color: var(--nod8-input-error-border);
}

.base-variable-input-container--error:focus-within {
  box-shadow: 0 0 0 1px var(--nod8-input-error-border);
}

.base-variable-input-container--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--nod8-input-disabled-bg);
}

.base-variable-input {
  flex: 1;
  width: 100%;
  min-width: 0;
  height: 36px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--nod8-input-text);
  font-size: var(--nod8-text-sm);
  padding: 0 var(--nod8-space-3);
  font-family: inherit;
}

.base-variable-input::placeholder {
  color: var(--nod8-input-placeholder);
}

.base-variable-input.has-left-icon {
  padding-left: 36px;
}

.base-variable-input.has-right-icon {
  padding-right: 36px;
}

.base-variable-input.has-variable-action {
  padding-right: 42px;
}

.base-variable-input--textarea {
  min-height: 80px;
  height: auto;
  padding-top: var(--nod8-space-2);
  padding-bottom: var(--nod8-space-2);
  line-height: 1.5;
  resize: vertical;
}

.base-variable-input__icon {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nod8-text-secondary);
  width: 36px;
  height: 100%;
  pointer-events: none;
}

.base-variable-input__icon--left {
  left: 0;
}

.base-variable-input__icon--right {
  right: 0;
}

.base-variable-input__button {
  position: absolute;
  top: 0;
  right: 1px;
  z-index: 2;
  width: 34px;
  height: 34px;
  margin: 1px;
  border-color: transparent;
  background: transparent;
}

.base-variable-input-wrapper__error {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-error);
  margin-top: 2px;
}

.base-variable-input-wrapper__hint {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  margin-top: 2px;
}
</style>
