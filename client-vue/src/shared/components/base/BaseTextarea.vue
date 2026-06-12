<template>
  <div class="base-textarea-wrapper">
    <label v-if="label" :for="id" class="base-input-wrapper__label">
      {{ label }} <span v-if="required" class="required">*</span>
    </label>

    <div
      class="base-textarea-container"
      :class="{
        'base-textarea-container--error': !!error,
        'base-textarea-container--disabled': disabled,
      }"
    >
      <textarea
        :id="id"
        :value="modelValue"
        class="base-textarea"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :rows="rows"
        @input="onInput"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        @dragover.prevent
        @drop="onDrop"
        v-bind="$attrs"
      ></textarea>
    </div>

    <p v-if="error" class="base-input-wrapper__error">{{ error }}</p>
    <p v-else-if="hint" class="base-input-wrapper__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { generateId } from '@/shared/utils/id'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    placeholder?: string
    error?: string
    hint?: string
    disabled?: boolean
    required?: boolean
    rows?: number
    id?: string
  }>(),
  {
    disabled: false,
    required: false,
    rows: 4,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const id = computed(() => props.id || generateId('textarea'))

const onInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

const onDrop = (e: DragEvent) => {
  const token = e.dataTransfer?.getData('text/plain')
  if (!token) return
  const target = e.target as HTMLTextAreaElement
  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? target.value.length
  const nextValue = `${target.value.slice(0, start)}${token}${target.value.slice(end)}`
  emit('update:modelValue', nextValue)
}

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-textarea-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-1);
  width: 100%;
}

.base-input-wrapper__label {
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-medium);
  color: var(--sailor-text-secondary);
}

.required {
  color: var(--sailor-text-error);
}

.base-textarea-container {
  display: flex;
  position: relative;
  background-color: var(--sailor-bg-overlay);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  transition: all var(--sailor-duration-fast) var(--sailor-ease-standard);
  width: 100%;
}

.base-textarea-container:focus-within {
  border-color: var(--sailor-border-strong);
}

.base-textarea-container--error {
  border-color: var(--sailor-red-500);
}
.base-textarea-container--error:focus-within {
  box-shadow: 0 0 0 1px var(--sailor-red-500);
}

.base-textarea-container--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--sailor-bg-muted);
}

.base-textarea {
  flex: 1;
  width: 100%;
  min-height: 80px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
  padding: var(--sailor-space-2) var(--sailor-space-3);
  resize: vertical;
  line-height: 1.5;
  font-family: inherit;
}

.base-textarea::placeholder {
  color: var(--sailor-text-disabled);
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
