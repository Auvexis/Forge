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
            : 'No inputs required for this workflow. Click Run to execute.'
        }}
      </div>

      <template v-if="hasSchema">
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
        {{ executionStore.isExecuting ? 'Executing...' : 'Run Workflow' }}
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useExecutionStore } from '@/features/workflow-editor/stores/execution.store'
import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import type { WorkflowSchemaField } from '@/core/types/workflow.types'
import BaseInput from '@/shared/components/base/BaseInput.vue'

const props = defineProps<{
  workflowId: string
  schema: Record<string, WorkflowSchemaField>
  triggerType: string
}>()

const executionStore = useExecutionStore()
const panelStore = useAppPanelStore()

const params = reactive<Record<string, unknown>>({})
const hasSchema = computed(() => Object.keys(props.schema).length > 0)

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
    await executionStore.execute(props.workflowId, { ...params })
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
  padding: var(--nod8-space-3) var(--nod8-space-4);
  border-bottom: 1px solid var(--nod8-border);
  background-color: var(--nod8-bg-surface);
  flex-shrink: 0;
}

.rwp-header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rwp-title {
  font-size: var(--nod8-text-sm);
  font-weight: 600;
  color: var(--nod8-text-primary);
}

.rwp-subtitle {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  text-transform: capitalize;
}

/* ── Body ─────────────────────────────────────────────────── */

.rwp-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--nod8-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-4);
  background-color: var(--nod8-bg-canvas);
}

.rwp-info-box {
  padding: var(--nod8-space-3);
  border-radius: var(--nod8-radius-sm);
  background-color: var(--nod8-bg-elevated);
  border: 1px solid var(--nod8-border);
  font-size: var(--nod8-text-sm);
  color: var(--nod8-text-muted);
  line-height: 1.5;
}

/* ── Fields ───────────────────────────────────────────────── */

.rwp-fields-label {
  font-size: var(--nod8-text-xs);
  font-weight: 600;
  color: var(--nod8-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

.rwp-fields {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-3);
}

.rwp-field {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
}

.rwp-field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rwp-field-label {
  font-size: var(--nod8-text-xs);
  font-weight: 500;
  color: var(--nod8-text-primary);
}

.rwp-required {
  color: var(--nod8-red-400);
  margin-left: 2px;
}

.rwp-field-type {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  background: var(--nod8-bg-elevated);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--nod8-border);
}

/* ── Input ────────────────────────────────────────────────── */

.rwp-input {
  width: 100%;
  height: 36px;
  background-color: var(--nod8-bg-overlay);
  border: 1px solid var(--nod8-border-strong);
  border-radius: var(--nod8-radius-sm);
  padding: 0 var(--nod8-space-3);
  font-size: var(--nod8-text-sm);
  font-family: inherit;
  color: var(--nod8-text-primary);
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--nod8-duration-fast);
}

.rwp-input:focus {
  border-color: var(--nod8-accent);
  box-shadow: 0 0 0 1px var(--nod8-accent);
}

.rwp-input::placeholder {
  color: var(--nod8-text-disabled);
}

.rwp-input--file {
  padding: 6px var(--nod8-space-3);
  height: auto;
  cursor: pointer;
  color: var(--nod8-text-muted);
}

/* ── Footer ───────────────────────────────────────────────── */

.rwp-footer {
  padding: var(--nod8-space-3) var(--nod8-space-4);
  border-top: 1px solid var(--nod8-border);
  background-color: var(--nod8-bg-surface);
  flex-shrink: 0;
}
</style>
