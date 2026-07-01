<template>
  <FormThemeProvider :theme="definition.theme">
    <header class="form-renderer-header">
      <span class="form-renderer-badge">{{ mode === 'test' ? 'Test Form' : mode === 'temp' ? 'Temporary Form' : 'Form' }}</span>
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

    <form v-else class="form-renderer-fields" @submit.prevent="submitForm">
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

const props = defineProps<{
  definition: FormDefinition
  mode: 'test' | 'prod' | 'temp'
  execId?: string
  values: Record<string, unknown>
  submitted: boolean
  isSubmitting: boolean
  submitError?: string
}>()

const emit = defineEmits<{
  submit: [values: Record<string, unknown>]
  'update:value': [key: string, value: unknown]
}>()

function submitForm(event: Event) {
  const form = event.currentTarget as HTMLFormElement
  const formData = new FormData(form)
  const submittedValues: Record<string, unknown> = { ...props.values }

  for (const field of props.definition.fields) {
    if (!field.name) continue

    if (field.type === 'checkbox-group' || field.type === 'multiselect') {
      submittedValues[field.name] = formData.getAll(field.name)
      continue
    }

    if (field.type === 'checkbox') {
      submittedValues[field.name] = formData.has(field.name)
      continue
    }

    const value = formData.get(field.name)
    if (value !== null) submittedValues[field.name] = value
  }

  emit('submit', submittedValues)
}
</script>
