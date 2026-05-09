<template>
  <FormThemeProvider :theme="definition.theme">
    <header class="form-renderer-header">
      <span class="form-renderer-badge">{{ mode === 'test' ? 'Test Form' : 'Form' }}</span>
      <h1>{{ definition.title }}</h1>
      <p v-if="definition.description">{{ definition.description }}</p>
      <div v-if="execId" class="form-renderer-watching">
        <span class="form-renderer-watching-dot"></span>
        Editor is watching - submit to trigger the workflow
      </div>
    </header>

    <div v-if="submitError" class="form-renderer-error">{{ submitError }}</div>
    <div v-if="submitted" class="form-renderer-success">
      <strong>Submitted successfully</strong>
      <span>Your form has been received.</span>
    </div>

    <form v-else class="form-renderer-fields" @submit.prevent="$emit('submit')">
      <FormFieldRenderer
        v-for="field in definition.fields"
        :key="field.name"
        :field="field"
        :value="values[field.name]"
        @update:value="$emit('update:value', field.name, $event)"
      />

      <button
        type="submit"
        class="form-renderer-submit"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? 'Submitting...' : 'Submit' }}
      </button>
    </form>
  </FormThemeProvider>
</template>

<script setup lang="ts">
import type { FormDefinition } from '@/core/api/workflows.api'
import FormFieldRenderer from './FormFieldRenderer.vue'
import FormThemeProvider from './FormThemeProvider.vue'

defineProps<{
  definition: FormDefinition
  mode: 'test' | 'prod'
  execId?: string
  values: Record<string, unknown>
  submitted: boolean
  isSubmitting: boolean
  submitError?: string
}>()

defineEmits<{
  submit: []
  'update:value': [key: string, value: unknown]
}>()
</script>

<style scoped>
.form-renderer-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 22px;
}

.form-renderer-badge {
  width: fit-content;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(236, 72, 153, 0.12);
  color: rgb(244, 114, 182);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--form-field-color, var(--nod8-text-primary));
  font-size: 24px;
}

p {
  margin: 0;
  color: var(--nod8-text-secondary);
  line-height: 1.5;
}

.form-renderer-fields {
  display: flex;
  flex-direction: column;
  gap: var(--form-field-spacing);
}

.form-renderer-submit {
  width: var(--form-button-width);
  border: 1px solid var(--form-button-border-color);
  border-radius: var(--form-button-radius);
  background: var(--form-button-background);
  color: var(--form-button-color);
  padding: 12px 18px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.form-renderer-submit:hover:not(:disabled) {
  background: var(--form-button-hover-background);
}

.form-renderer-submit:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.form-renderer-error,
.form-renderer-success {
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.form-renderer-error {
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.1);
  color: var(--nod8-red-400);
}

.form-renderer-success {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid rgba(52, 211, 153, 0.35);
  background: rgba(52, 211, 153, 0.1);
  color: var(--nod8-green-400);
}

.form-renderer-watching {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.3);
  color: #a78bfa;
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
}

.form-renderer-watching-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #a78bfa;
  flex-shrink: 0;
  animation: form-renderer-pulse 1.4s ease-in-out infinite;
}

@keyframes form-renderer-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.65); }
}
</style>
