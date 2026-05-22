<template>
  <div class="plugin-creator-expression-input editor-field">
    <label v-if="label" class="editor-field__label">
      <LucideIcon name="braces" :size="13" />
      {{ label }}
    </label>
    <div v-if="showHint" class="editor-hint editor-hint--violet">
      JS expression can use
      <span class="editor-code-snippet">params</span>
      <span class="editor-code-snippet">credentials</span>
      <span class="editor-code-snippet">previous</span>
      <span class="editor-code-snippet">steps</span>
    </div>
    <div class="editor-expression-control">
      <input
        :value="modelValue"
        :placeholder="placeholder"
        spellcheck="false"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <PluginCreatorVariablePicker @select="$emit('update:modelValue', appendVariable($event))" />
    </div>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import PluginCreatorVariablePicker from './PluginCreatorVariablePicker.vue'

const props = withDefaults(
  defineProps<{ modelValue: string; label?: string; placeholder?: string; showHint?: boolean }>(),
  { showHint: true },
)
defineEmits<{ 'update:modelValue': [value: string] }>()

const variableRoots = ['params', 'credentials', 'steps']

function appendVariable(variableName: string) {
  return props.modelValue ? `${props.modelValue} ${variableName}` : variableName
}
</script>

<style scoped>
.plugin-creator-expression-input {
  width: 100%;
}

.editor-expression-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-surface);
  overflow: visible;
}

.editor-expression-control:focus-within {
  border-color: var(--sailor-accent);
}

.editor-expression-control input {
  height: 36px;
  min-width: 0;
  padding: 0 12px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sailor-text-primary);
  font-family: var(--sailor-font-mono);
  font-size: 12px;
}

.editor-expression-control input::placeholder {
  color: var(--sailor-text-muted);
  opacity: 0.55;
}
</style>
