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

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-textarea-wrapper {
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

.base-textarea-container {
  display: flex;
  position: relative;
  background-color: var(--nod8-bg-overlay);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  transition: all var(--nod8-duration-fast) var(--nod8-ease-standard);
  width: 100%;
}

.base-textarea-container:focus-within {
  border-color: var(--nod8-border-strong);
}

.base-textarea-container--error {
  border-color: var(--nod8-red-500);
}
.base-textarea-container--error:focus-within {
  box-shadow: 0 0 0 1px var(--nod8-red-500);
}

.base-textarea-container--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--nod8-bg-muted);
}

.base-textarea {
  flex: 1;
  width: 100%;
  min-height: 80px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--nod8-text-primary);
  font-size: var(--nod8-text-sm);
  padding: var(--nod8-space-2) var(--nod8-space-3);
  resize: vertical;
  line-height: 1.5;
  font-family: inherit;
}

.base-textarea::placeholder {
  color: var(--nod8-text-disabled);
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
