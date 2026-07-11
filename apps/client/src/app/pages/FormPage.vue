<template>
  <div v-if="isLoading" class="form-page-state">Loading form...</div>

  <FormRenderer
    v-else-if="definition"
    :definition="definition"
    :mode="mode"
    :exec-id="execId"
    :values="values"
    :submitted="submitted"
    :is-submitting="isSubmitting"
    :submit-error="submitError"
    @update:value="updateValue"
    @submit="handleSubmit"
  />

  <main v-else class="form-page-state form-page-state--error">
    {{ loadError || 'Form not available' }}
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { workflowsApi, type FormDefinition } from '@/core/api/workflows.api'
import FormRenderer from '@/features/workflow-editor/components/form/FormRenderer.vue'

const route = useRoute()
const mode = computed<'test' | 'prod' | 'temp'>(() => {
  if (route.name === 'temporary-form') return 'temp'
  return route.name === 'form-test' ? 'test' : 'prod'
})
const formId = computed(() => String(route.params.formId ?? ''))
const profileId = computed(() => {
  const value = route.params.profileId
  return typeof value === 'string' && value.trim() ? value : undefined
})
const execId = computed(() => String(route.query.execId ?? ''))

const definition = ref<FormDefinition | null>(null)
const values = reactive<Record<string, unknown>>({})
const isLoading = ref(true)
const isSubmitting = ref(false)
const submitted = ref(false)
const loadError = ref('')
const submitError = ref('')

function updateValue(key: string, value: unknown) {
  values[key] = value
}

async function loadForm() {
  isLoading.value = true
  loadError.value = ''
  try {
    definition.value =
      mode.value === 'temp'
        ? await workflowsApi.getTemporaryFormDefinition(formId.value)
        : await workflowsApi.getFormDefinition(formId.value, mode.value, profileId.value)
  } catch (err: any) {
    loadError.value = err?.message ?? 'Form not available'
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit(submittedValues?: Record<string, unknown>) {
  submitError.value = ''
  isSubmitting.value = true
  const payload = submittedValues ?? { ...values }
  try {
    if (mode.value === 'temp') {
      await workflowsApi.submitTemporaryForm(formId.value, payload)
    } else {
      await workflowsApi.submitForm(
        formId.value,
        mode.value,
        payload,
        execId.value || undefined,
        profileId.value,
      )
    }
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
.form-page-state {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 16px;
  background: #0b0d12;
  color: var(--fabric-text-secondary);
  font-size: 14px;
}

.form-page-state--error {
  border: 0;
  background:
    radial-gradient(circle at 20% 0%, rgba(236, 72, 153, 0.16), transparent 28%),
    linear-gradient(135deg, #0b0d12 0%, #111827 100%);
  color: var(--fabric-red-400);
}
</style>
