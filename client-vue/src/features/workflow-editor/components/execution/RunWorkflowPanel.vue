<template>
  <div class="rwp-shell">
    <!-- Header -->
    <div class="rwp-header">
      <div class="rwp-header-info">
        <span class="rwp-title">Run Workflow</span>
        <span class="rwp-subtitle">{{ triggerType }} trigger</span>
      </div>
    </div>

    <!-- Body -->
    <div class="rwp-body">
      <div class="rwp-info-box">
        {{
          hasSchema
            ? 'Fill in the required inputs below to start execution.'
            : isFormTrigger
              ? 'Fill out the form below. Execution starts after submission.'
              : 'No inputs required for this workflow. Click Run to execute.'
        }}
      </div>

      <template v-if="isFormTrigger">
        <p class="rwp-fields-label">Form Fields</p>
        <div class="rwp-fields">
          <div v-for="field in formFields" :key="field.name" class="rwp-field">
            <div class="rwp-field-header">
              <label class="rwp-field-label">
                {{ field.label || field.name }}
                <span v-if="field.required" class="rwp-required">*</span>
              </label>
              <span class="rwp-field-type">{{ field.type }}</span>
            </div>
            <textarea
              v-if="field.type === 'textarea'"
              class="rwp-textarea"
              :value="stringParam(field.name)"
              :placeholder="field.placeholder || `Enter ${field.label || field.name}...`"
              @input="params[field.name] = ($event.target as HTMLTextAreaElement).value"
            ></textarea>
            <BaseInput
              v-else-if="field.type !== 'file'"
              :type="field.type === 'date' || field.type === 'password' || field.type === 'number' || field.type === 'email' ? field.type : 'text'"
              :model-value="stringParam(field.name)"
              :placeholder="field.placeholder || `Enter ${field.label || field.name}...`"
              @update:model-value="params[field.name] = $event as string"
            />
            <BaseInput
              v-else
              type="file"
              @change="onFileChange(field.name, $event)"
            />
          </div>
        </div>
      </template>

      <template v-else-if="hasSchema">
        <p class="rwp-fields-label">Required Inputs</p>
        <div class="rwp-fields">
          <div v-for="(field, key) in schema" :key="key" class="rwp-field">
            <div class="rwp-field-header">
              <label class="rwp-field-label">
                {{ key }}
                <span v-if="field.required" class="rwp-required">*</span>
              </label>
              <span class="rwp-field-type">{{ field.type }}</span>
            </div>
            <BaseInput
              v-if="field.type !== 'file'"
              :model-value="stringParam(key)"
              @update:model-value="params[key] = $event as string"
              :placeholder="`Enter ${key}...`"
            />
            <BaseInput
              v-else
              type="file"
              @change="onFileChange(key, $event)"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <div class="rwp-footer">
      <BaseButton
        variant="primary"
        size="md"
        :full-width="true"
        :loading="executionStore.isExecuting"
        :disabled="executionStore.isExecuting"
        icon-left="play"
        @click="handleRun"
      >
        {{ executionStore.isExecuting ? 'Executing...' : isFormTrigger ? 'Submit Form & Run' : 'Run Workflow' }}
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useExecutionStore } from '@/features/workflow-editor/stores/execution.store'
import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import type { FormTriggerField, WorkflowSchemaField } from '@/core/types/workflow.types'
import BaseInput from '@/shared/components/base/BaseInput.vue'

const props = defineProps<{
  workflowId: string
  schema: Record<string, WorkflowSchemaField>
  triggerType: string
  triggerNodeId?: string
  formId?: string
  formFields?: FormTriggerField[]
}>()

const executionStore = useExecutionStore()
const panelStore = useAppPanelStore()

const params = reactive<Record<string, unknown>>({})
const hasSchema = computed(() => Object.keys(props.schema).length > 0)
const formFields = computed(() => props.formFields ?? [])
const isFormTrigger = computed(() => props.triggerType === 'form')

/** Safely read a string-typed param value for text/number inputs. */
function stringParam(key: string): string {
  const val = params[key]
  if (typeof val === 'string') return val
  return ''
}

function onFileChange(key: string, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) params[key] = file
}

async function handleRun() {
  try {
    if (isFormTrigger.value) {
      await executionStore.executeFormSubmission(props.formId ?? props.workflowId, 'test', { ...params })
    } else {
      await executionStore.executeTrigger(props.workflowId, props.triggerNodeId ?? 'trigger', { ...params })
    }
    panelStore.closePanel()
  } catch {
    // error toast is handled inside execute()
  }
}
</script>

<style scoped>
.rwp-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ── Header ───────────────────────────────────────────────── */

.rwp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sailor-space-3) var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border);
  background-color: var(--sailor-bg-surface);
  flex-shrink: 0;
}

.rwp-header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rwp-title {
  font-size: var(--sailor-text-sm);
  font-weight: 600;
  color: var(--sailor-text-primary);
}

.rwp-subtitle {
  font-size: var(--sailor-text-xs);
  color: var(--sailor-text-muted);
  text-transform: capitalize;
}

/* ── Body ─────────────────────────────────────────────────── */

.rwp-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--sailor-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-4);
  background-color: var(--sailor-bg-canvas);
}

.rwp-info-box {
  padding: var(--sailor-space-3);
  border-radius: var(--sailor-radius-sm);
  background-color: var(--sailor-bg-elevated);
  border: 1px solid var(--sailor-border);
  font-size: var(--sailor-text-sm);
  color: var(--sailor-text-muted);
  line-height: 1.5;
}

/* ── Fields ───────────────────────────────────────────────── */

.rwp-fields-label {
  font-size: var(--sailor-text-xs);
  font-weight: 600;
  color: var(--sailor-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

.rwp-fields {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-3);
}

.rwp-field {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-1);
}

.rwp-field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rwp-field-label {
  font-size: var(--sailor-text-xs);
  font-weight: 500;
  color: var(--sailor-text-primary);
}

.rwp-required {
  color: var(--sailor-red-400);
  margin-left: 2px;
}

.rwp-field-type {
  font-size: var(--sailor-text-xs);
  color: var(--sailor-text-muted);
  background: var(--sailor-bg-elevated);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--sailor-border);
}

/* ── Input ────────────────────────────────────────────────── */

.rwp-input {
  width: 100%;
  height: 36px;
  background-color: var(--sailor-bg-overlay);
  border: 1px solid var(--sailor-border-strong);
  border-radius: var(--sailor-radius-sm);
  padding: 0 var(--sailor-space-3);
  font-size: var(--sailor-text-sm);
  font-family: inherit;
  color: var(--sailor-text-primary);
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--sailor-duration-fast);
}

.rwp-input:focus {
  border-color: var(--sailor-accent);
  box-shadow: 0 0 0 1px var(--sailor-accent);
}

.rwp-input::placeholder {
  color: var(--sailor-text-disabled);
}

.rwp-input--file {
  padding: 6px var(--sailor-space-3);
  height: auto;
  cursor: pointer;
  color: var(--sailor-text-muted);
}

.rwp-textarea {
  width: 100%;
  min-height: 96px;
  resize: vertical;
  background-color: var(--sailor-bg-overlay);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  padding: 10px 12px;
  color: var(--sailor-text-primary);
  font: inherit;
  outline: none;
}

.rwp-textarea:focus {
  border-color: var(--sailor-accent);
}

/* ── Footer ───────────────────────────────────────────────── */

.rwp-footer {
  padding: var(--sailor-space-3) var(--sailor-space-4);
  border-top: 1px solid var(--sailor-border);
  background-color: var(--sailor-bg-surface);
  flex-shrink: 0;
}
</style>
