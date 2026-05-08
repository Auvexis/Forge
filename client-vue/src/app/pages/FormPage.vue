<template>
  <main class="form-page">
    <section class="form-card">
      <div v-if="isLoading" class="form-state">Loading form...</div>

      <template v-else-if="definition">
        <header class="form-header">
          <span class="form-badge">{{ mode === 'test' ? 'Test Form' : 'Form' }}</span>
          <h1>{{ definition.title }}</h1>
          <p v-if="definition.description">{{ definition.description }}</p>
        </header>

        <div v-if="submitError" class="form-error">{{ submitError }}</div>
        <div v-if="submitted" class="form-success">
          <strong>Submitted successfully</strong>
          <span>Your form has been received.</span>
        </div>

        <form v-else class="form-fields" @submit.prevent="handleSubmit">
          <label v-for="field in definition.fields" :key="field.name" class="form-field">
            <span>
              {{ field.label || field.name }}
              <em v-if="field.required">*</em>
            </span>
            <textarea
              v-if="field.type === 'textarea'"
              :value="stringValue(field.name)"
              :required="field.required"
              :placeholder="field.placeholder"
              @input="values[field.name] = ($event.target as HTMLTextAreaElement).value"
            ></textarea>
            <BaseInput
              v-else-if="field.type !== 'file'"
              :type="inputType(field.type)"
              :model-value="stringValue(field.name)"
              :required="field.required"
              :placeholder="field.placeholder"
              @update:model-value="values[field.name] = $event as string"
            />
            <BaseInput
              v-else
              type="file"
              :required="field.required"
              @change="onFileChange(field.name, $event)"
            />
          </label>

          <BaseButton
            type="submit"
            variant="primary"
            full-width
            :loading="isSubmitting"
            :disabled="isSubmitting"
          >
            Submit
          </BaseButton>
        </form>
      </template>

      <div v-else class="form-state form-state--error">
        {{ loadError || 'Form not available' }}
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { workflowsApi, type FormDefinition } from '@/core/api/workflows.api'
import type { FormTriggerField } from '@/core/types/workflow.types'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'

const route = useRoute()
const mode = computed<'test' | 'prod'>(() => route.name === 'form-test' ? 'test' : 'prod')
const formId = computed(() => String(route.params.formId ?? ''))

const definition = ref<FormDefinition | null>(null)
const values = reactive<Record<string, unknown>>({})
const isLoading = ref(true)
const isSubmitting = ref(false)
const submitted = ref(false)
const loadError = ref('')
const submitError = ref('')

function stringValue(key: string): string {
  const value = values[key]
  return typeof value === 'string' ? value : ''
}

function inputType(type: FormTriggerField['type']) {
  return type === 'date' || type === 'password' || type === 'number' || type === 'email'
    ? type
    : 'text'
}

function onFileChange(key: string, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) values[key] = file
}

async function loadForm() {
  isLoading.value = true
  loadError.value = ''
  try {
    definition.value = await workflowsApi.getFormDefinition(formId.value, mode.value)
  } catch (err: any) {
    loadError.value = err?.message ?? 'Form not available'
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit() {
  submitError.value = ''
  isSubmitting.value = true
  try {
    await workflowsApi.submitForm(formId.value, mode.value, { ...values })
    submitted.value = true
  } catch (err: any) {
    submitError.value = err?.message ?? 'Failed to submit form'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(loadForm)
</script>

<style scoped>
.form-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 16px;
  background:
    radial-gradient(circle at 20% 0%, rgba(236, 72, 153, 0.16), transparent 28%),
    linear-gradient(135deg, #0b0d12 0%, #111827 100%);
  color: var(--nod8-text-primary);
}

.form-card {
  width: min(100%, 560px);
  padding: 28px;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-lg);
  background: var(--nod8-bg-surface);
  box-shadow: var(--nod8-shadow-xl);
}

.form-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 22px;
}

.form-badge {
  width: fit-content;
  padding: 3px 8px;
  border-radius: var(--nod8-radius-sm);
  background: rgba(236, 72, 153, 0.12);
  color: rgb(244, 114, 182);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 24px;
}

p {
  margin: 0;
  color: var(--nod8-text-secondary);
  line-height: 1.5;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--nod8-text-secondary);
}

.form-field em {
  color: var(--nod8-red-400);
  font-style: normal;
}

textarea {
  min-height: 112px;
  resize: vertical;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  background: var(--nod8-bg-overlay);
  color: var(--nod8-text-primary);
  padding: 10px 12px;
  font: inherit;
  outline: none;
}

textarea:focus {
  border-color: var(--nod8-accent);
}

.form-state,
.form-error,
.form-success {
  padding: 12px;
  border-radius: var(--nod8-radius-sm);
  font-size: 14px;
}

.form-state {
  color: var(--nod8-text-secondary);
}

.form-state--error,
.form-error {
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.1);
  color: var(--nod8-red-400);
}

.form-success {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid rgba(52, 211, 153, 0.35);
  background: rgba(52, 211, 153, 0.1);
  color: var(--nod8-green-400);
}
</style>
