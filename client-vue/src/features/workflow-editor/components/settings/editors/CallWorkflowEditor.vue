<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        placeholder="Call another workflow"
        @update:model-value="updateNodeData({ name: $event as string })"
      />
    </EditorField>

    <EditorField label="Published Workflow" icon="workflow">
      <BaseSelect
        :model-value="(node.data.targetWorkflowId as string) || ''"
        :options="workflowOptions"
        placeholder="Select workflow..."
        @update:model-value="handleWorkflowChange"
      />
    </EditorField>

    <EditorField v-if="selectedWorkflow" label="Callable Trigger" icon="zap">
      <BaseSelect
        :model-value="(node.data.targetTriggerId as string) || ''"
        :options="triggerOptions"
        placeholder="Select trigger..."
        @update:model-value="handleTriggerChange"
      />
    </EditorField>

    <div v-if="selectedTrigger" class="call-trigger-summary">
      <div class="call-trigger-summary__title">
        <LucideIcon :name="selectedTrigger.icon || 'zap'" :size="16" />
        <span>{{ selectedTrigger.name }}</span>
      </div>
      <div class="call-trigger-summary__meta">
        <span>{{ selectedTrigger.type }}</span>
        <span>{{ selectedTrigger.id }}</span>
      </div>
    </div>

    <template v-if="isAgentTool">
      <EditorField label="Tool Name" icon="wrench">
        <BaseInput
          :model-value="(node.data.toolName as string) || ''"
          placeholder="call_customer_lookup"
          @update:model-value="updateNodeData({ toolName: $event as string })"
        />
      </EditorField>

      <EditorField label="Tool Instructions">
        <ExpressionTextarea
          :model-value="(node.data.toolDescription as string) || ''"
          :rows="5"
          placeholder="Tell the agent when to use this workflow, what it should send, and how to interpret the result."
          @update:model-value="updateToolDescription"
        />
      </EditorField>
    </template>

    <div v-if="schemaProperties.length" class="editor-stack mt-2">
      <div class="cw-params-header">
        <div class="cw-params-indicator"></div>
        <h3 class="cw-params-title">Parameter Defaults</h3>
      </div>

      <div v-for="property in schemaProperties" :key="property.key" class="cw-param-card">
        <div class="cw-param-head">
          <div class="cw-param-info">
            <span class="cw-param-label">{{ property.label }}</span>
            <span v-if="property.description" class="cw-param-desc">{{ property.description }}</span>
          </div>
          <span class="cw-param-type">{{ property.type }}</span>
        </div>

        <template v-if="property.enumValues.length">
          <BaseSelect
            :model-value="selectDefaultValue(property.key)"
            :options="property.enumValues.map((value) => ({ label: value, value }))"
            :placeholder="`Select ${property.label}...`"
            @update:model-value="(value) => updateInputDefault(property.key, value)"
          />
        </template>

        <template v-else-if="property.type === 'boolean'">
          <div class="cw-param-toggle">
            <BaseSwitch
              :model-value="Boolean(inputDefaultValue(property.key))"
              @update:model-value="(value) => updateInputDefault(property.key, value)"
            />
            <span class="cw-param-toggle-text">
              {{ inputDefaultValue(property.key) ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
        </template>

        <template v-else-if="property.type === 'object' || property.type === 'array'">
          <BaseCodeEditor
            :model-value="codeDefaultValue(property.key)"
            language="json"
            height="180px"
            @update:model-value="(value) => updateInputDefault(property.key, parseJsonDefault(value))"
          />
        </template>

        <template v-else>
          <ExpressionInput
            :model-value="String(inputDefaultValue(property.key) ?? '')"
            :placeholder="property.placeholder"
            @update:model-value="(value) => updateInputDefault(property.key, value)"
          />
        </template>
      </div>
    </div>

    <template v-if="isAgentTool">
      <EditorField label="Approval">
        <BaseSwitch
          :model-value="Boolean(node.data.requiresApproval)"
          label="Require approval"
          @update:model-value="updateNodeData({ requiresApproval: $event })"
        />
      </EditorField>

      <EditorField label="Timeout">
        <BaseInput
          type="number"
          :model-value="Number(node.data.timeoutMs ?? 30000)"
          placeholder="30000"
          @update:model-value="updateNodeData({ timeoutMs: Number($event) })"
        />
      </EditorField>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import { workflowsApi, type CallableWorkflowTrigger } from '@/core/api/workflows.api'
import { useApi } from '@/shared/composables/useApi'
import EditorField from './EditorField.vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'

const props = defineProps<NodeEditorProps>()

const {
  data: callableWorkflows,
  execute: executeCallableWorkflows,
} = useApi(workflowsApi.listCallable, [])
executeCallableWorkflows()

const selectedWorkflow = computed(() => {
  const workflowId = props.node.data.targetWorkflowId
  return callableWorkflows.value?.find((workflow) => workflow.id === workflowId)
})

const selectedTrigger = computed<CallableWorkflowTrigger | undefined>(() => {
  const triggerId = props.node.data.targetTriggerId
  return selectedWorkflow.value?.triggers.find((trigger) => trigger.id === triggerId)
})

const isAgentTool = computed(() => {
  return props.edges.some((edge) => {
    if (edge.source !== props.node.id) return false
    if (edge.targetHandle !== 'tool') return false
    return props.nodes.find((node) => node.id === edge.target)?.data.type === 'ai-agent'
  })
})

const workflowOptions = computed(() => {
  return (callableWorkflows.value ?? []).map((workflow) => ({
    label: workflow.name,
    value: workflow.id,
    icon: 'workflow',
  }))
})

const triggerOptions = computed(() => {
  return (selectedWorkflow.value?.triggers ?? []).map((trigger) => ({
    label: trigger.name,
    value: trigger.id,
    icon: trigger.icon || 'zap',
  }))
})

const schemaProperties = computed(() => {
  const properties = selectedTrigger.value?.schema?.properties
  if (!properties || typeof properties !== 'object') return []

  return Object.entries(properties).map(([key, raw]) => {
    const schema = raw as Record<string, any>
    const type = Array.isArray(schema.type)
      ? schema.type.join(' | ')
      : String(schema.type ?? 'any')
    return {
      key,
      label: String(schema.title ?? schema['x-label'] ?? key),
      type,
      description: typeof schema.description === 'string' ? schema.description : '',
      enumValues: Array.isArray(schema.enum) ? schema.enum.map(String) : [],
      placeholder: schema.default !== undefined ? String(schema.default) : `Enter value for ${key}`,
    }
  })
})

function handleWorkflowChange(value: string | number | null) {
  const workflowId = String(value || '')
  const workflow = callableWorkflows.value?.find((item) => item.id === workflowId)
  const firstTrigger = workflow?.triggers[0]
  props.updateNodeData({
    targetWorkflowId: workflowId,
    targetWorkflowName: workflow?.name,
    targetTriggerId: firstTrigger?.id ?? '',
    targetTrigger: firstTrigger,
    toolName: firstTrigger ? defaultToolName(workflow?.name ?? '', firstTrigger.name) : '',
    inputDefaults: {},
  })
}

function handleTriggerChange(value: string | number | null) {
  const triggerId = String(value || '')
  const trigger = selectedWorkflow.value?.triggers.find((item) => item.id === triggerId)
  props.updateNodeData({
    targetTriggerId: triggerId,
    targetTrigger: trigger,
    toolName: trigger ? defaultToolName(selectedWorkflow.value?.name ?? '', trigger.name) : '',
    inputDefaults: {},
  })
}

function updateToolDescription(value: string) {
  const next = value.trim()
  props.updateNodeData({ toolDescription: next || undefined })
}

function inputDefaultValue(key: string) {
  return (props.node.data.inputDefaults as Record<string, unknown> | undefined)?.[key]
}

function selectDefaultValue(key: string): string | number | null {
  const value = inputDefaultValue(key)
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

function updateInputDefault(key: string, value: unknown) {
  props.updateNodeData({
    inputDefaults: {
      ...((props.node.data.inputDefaults as Record<string, unknown> | undefined) ?? {}),
      [key]: value,
    },
  })
}

function codeDefaultValue(key: string) {
  return JSON.stringify(inputDefaultValue(key) ?? {}, null, 2)
}

function parseJsonDefault(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function defaultToolName(workflowName: string, triggerName: string) {
  return `call_${slugPart(workflowName)}_${slugPart(triggerName)}`.replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function slugPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_')
}
</script>

<style scoped>
.mt-2 {
  margin-top: var(--sailor-space-2);
}

.call-trigger-summary {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-muted);
}

.call-trigger-summary__title,
.call-trigger-summary__meta {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
}

.call-trigger-summary__title {
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
  font-weight: 700;
}

.call-trigger-summary__meta span,
.cw-param-type {
  padding: 2px 6px;
  border: 1px solid var(--sailor-border);
  border-radius: 4px;
  color: var(--sailor-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.cw-params-header {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  border-bottom: 1px solid var(--sailor-border);
  padding-bottom: var(--sailor-space-2);
}

.cw-params-indicator {
  width: 4px;
  height: 16px;
  background-color: var(--sailor-text-primary);
  border-radius: 9999px;
}

.cw-params-title {
  margin: 0;
  color: var(--sailor-text-primary);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  opacity: 0.7;
  text-transform: uppercase;
}

.cw-param-card {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-3);
  padding: var(--sailor-space-4);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-lg);
}

.cw-param-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sailor-space-3);
}

.cw-param-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.cw-param-label {
  color: var(--sailor-text-primary);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.cw-param-desc {
  margin-top: 2px;
  color: var(--sailor-text-muted);
  font-size: 10px;
  line-height: 1.35;
}

.cw-param-toggle {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  height: 40px;
}

.cw-param-toggle-text {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
  font-style: italic;
  font-weight: 500;
}
</style>
