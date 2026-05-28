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
      <BaseInput
        class="plugin-creator-expression-input__field"
        :model-value="modelValue"
        :placeholder="placeholder"
        spellcheck="false"
        @update:model-value="$emit('update:modelValue', String($event))"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'

withDefaults(
  defineProps<{ modelValue: string; label?: string; placeholder?: string; showHint?: boolean }>(),
  { showHint: true },
)
defineEmits<{ 'update:modelValue': [value: string] }>()

const variableRoots = ['params', 'credentials', 'steps']
</script>

<style scoped>
.plugin-creator-expression-input {
  width: 100%;
}

.editor-field__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px 4px;
}

.editor-expression-control {
  width: 100%;
}

.plugin-creator-expression-input__field {
  min-width: 0;
}

:deep(.plugin-creator-expression-input__field .base-input-container) {
  width: 100%;
}

:deep(.plugin-creator-expression-input__field .base-input) {
  padding-right: 12px;
  font-family: var(--sailor-font-mono);
  font-size: 12px;
}
</style>
