<template>
  <div class="web-page-blueprint-inspector">
    <p v-if="!selectedNodeId" class="web-page-editor__empty">Select a Blueprint node.</p>

    <template v-else>
      <BaseInspectorSection title="Node" icon="box">
        <BaseInspectorRow label="ID" :value="selectedNodeId" />
        <BaseInspectorRow label="Kind" :value="node?.kind ?? inferredKind" />
        <BaseInspectorRow
          label="Label"
          :value="node?.label ?? selectedNodeId"
          :editable="Boolean(node)"
          @update:value="node && $emit('updateNodeLabel', node.id, $event)"
        />
        <BaseInspectorRow v-if="node" label="Type" :value="node.type" />
      </BaseInspectorSection>

      <BaseInspectorSection v-if="node" title="Fields" icon="list-tree">
        <div v-if="node.type === 'transform-data'" class="web-page-blueprint-inspector-actions">
          <BaseInspectorButton label="Add Field" icon="plus" @click="$emit('addNodeField', node.id)" />
        </div>
        <BaseInspectorRow
          v-for="field in node.fields"
          :key="field.id"
          :label="field.label"
          :value="field.expression ?? field.value ?? ''"
          :placeholder="field.type"
          :editable="Boolean(field.configurable)"
          @update:value="$emit('updateFieldValue', node.id, field.id, $event)"
        />
        <p v-if="node.fields.length === 0" class="web-page-blueprint-inspector-empty">
          No fields.
        </p>
      </BaseInspectorSection>

      <template v-if="node?.type === 'run-workflow'">
        <BaseInspectorSection title="Workflow" icon="workflow">
          <div class="web-page-blueprint-inspector-actions">
            <BaseInspectorButton label="Refresh" icon="refresh-cw" @click="loadWorkflows" />
          </div>
          <BaseInspectorSelect
            label="Workflow"
            :model-value="runWorkflowData.workflowId"
            placeholder="Choose workflow"
            :options="workflowOptions"
            @update:model-value="selectWorkflow"
          />
          <BaseInspectorSelect
            label="Trigger"
            :model-value="runWorkflowData.triggerId"
            placeholder="Choose trigger"
            :options="triggerOptions"
            @update:model-value="selectTrigger"
          />
        </BaseInspectorSection>

        <BaseInspectorSection v-if="activeAction" title="Properties" icon="sliders-horizontal">
          <BaseInspectorSelect
            label="Event"
            :model-value="runWorkflowData.eventType"
            :options="eventTypeOptions"
            @update:model-value="updateRunWorkflowEventType"
          />
          <BaseInspectorRow label="Action" :value="activeAction.name" />
          <BaseInspectorRow label="Trigger Type" :value="activeAction.triggerType" />
        </BaseInspectorSection>

        <BaseInspectorSection v-if="activeAction" title="Parameters" icon="list-plus">
          <BaseInspectorRow
            v-for="input in activeAction.inputs"
            :key="input.key"
            :label="input.label"
            :value="stringifyInputValue(runWorkflowInput[input.key])"
            :placeholder="input.type"
            editable
            @update:value="updateRunWorkflowInput(input.key, $event, input.type)"
          />
          <p v-if="activeAction.inputs.length === 0" class="web-page-blueprint-inspector-empty">
            No parameters.
          </p>
        </BaseInspectorSection>

        <BaseInspectorSection v-if="activeAction" title="Test Run" icon="play">
          <div class="web-page-blueprint-inspector-actions">
            <BaseInspectorButton
              :label="runWorkflowStatus === 'running' ? 'Running' : 'Test Run'"
              :icon="runWorkflowStatus === 'running' ? 'loader-circle' : 'play'"
              @click="testRunWorkflow"
            />
          </div>
          <p v-if="runWorkflowError" class="web-page-blueprint-inspector-error">{{ runWorkflowError }}</p>
          <pre v-if="runWorkflowResultJson" class="web-page-blueprint-inspector-result">{{ runWorkflowResultJson }}</pre>
        </BaseInspectorSection>

        <BaseInspectorSection v-else title="Test Run" icon="play">
          <p class="web-page-blueprint-inspector-empty">
            Choose a workflow and trigger first.
          </p>
        </BaseInspectorSection>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  buildDefaultActionInput,
  createPageActionDefinition,
  type PageActionDefinition,
  type PageActionInputField,
  type PageActionRunStatus,
  type PageActionTriggerSummary,
  type PageActionWorkflowSummary,
  workflowPageActionGateway,
} from '@/core/page-actions'
import type { PageBlueprintDocument } from '../pageBlueprintDocument.ts'
import BaseInspectorButton from './BaseInspectorButton.vue'
import BaseInspectorRow from './BaseInspectorRow.vue'
import BaseInspectorSection from './BaseInspectorSection.vue'
import BaseInspectorSelect from './BaseInspectorSelect.vue'

const props = defineProps<{
  document: PageBlueprintDocument
  selectedNodeId: string | null
  workflows: PageActionWorkflowSummary[]
}>()

const emit = defineEmits<{
  updateNodeLabel: [nodeId: string, label: string]
  updateFieldValue: [nodeId: string, fieldId: string, value: string]
  addNodeField: [nodeId: string]
  configureRunWorkflow: [nodeId: string, payload: RunWorkflowConfigPayload]
  updateRunWorkflowEventType: [nodeId: string, eventType: string]
  updateRunWorkflowInput: [nodeId: string, key: string, value: unknown]
  testRunWorkflow: [nodeId: string, result: unknown]
  refreshWorkflows: []
}>()

const node = computed(() => props.document.nodes.find((item) => item.id === props.selectedNodeId))
const runWorkflowError = ref('')
const runWorkflowResultJson = ref('')
const runWorkflowStatus = ref<PageActionRunStatus>('idle')
const eventTypeOptions = [
  { label: 'Click', value: 'click' },
  { label: 'Change', value: 'change' },
  { label: 'Submit', value: 'submit' },
  { label: 'Mount', value: 'mount' },
]

watch(node, (nextNode) => {
  runWorkflowError.value = ''
  runWorkflowStatus.value = 'idle'
  const savedJson = nextNode?.data?.testResultJson
  runWorkflowResultJson.value = typeof savedJson === 'string' ? savedJson : ''
}, { immediate: true })

onMounted(loadWorkflows)

const inferredKind = computed(() => {
  if (props.selectedNodeId?.startsWith('blueprint-element:')) return 'element'
  if (props.selectedNodeId?.startsWith('blueprint-workflow:')) return 'workflow'
  if (props.selectedNodeId?.startsWith('blueprint-binding:')) return 'binding'
  return 'node'
})
const workflowOptions = computed(() => props.workflows.map((workflow) => ({
  label: workflow.name,
  value: workflow.id,
})))
const runWorkflowData = computed(() => {
  const data = node.value?.data ?? {}
  return {
    workflowId: typeof data.workflowId === 'string' ? data.workflowId : '',
    triggerId: typeof data.triggerId === 'string' ? data.triggerId : '',
    eventType: typeof data.eventType === 'string' ? data.eventType : 'click',
    input: isRecord(data.input) ? data.input : {},
  }
})
const selectedWorkflow = computed(() =>
  props.workflows.find((workflow) => workflow.id === runWorkflowData.value.workflowId) ?? null,
)
const triggerOptions = computed(() => (selectedWorkflow.value?.actions ?? []).map((trigger) => ({
  label: trigger.name,
  value: trigger.id,
})))
const selectedTrigger = computed(() =>
  selectedWorkflow.value?.actions.find((trigger) => trigger.id === runWorkflowData.value.triggerId) ?? null,
)
const activeAction = computed<PageActionDefinition | null>(() =>
  selectedTrigger.value ? createPageActionDefinition(selectedTrigger.value) : null,
)
const runWorkflowInput = computed(() => ({
  ...(activeAction.value ? buildDefaultActionInput(activeAction.value.inputs) : {}),
  ...runWorkflowData.value.input,
}))

function loadWorkflows() {
  emit('refreshWorkflows')
}

function selectWorkflow(workflowId: string) {
  if (!node.value) return
  const workflow = props.workflows.find((item) => item.id === workflowId)
  emit('configureRunWorkflow', node.value.id, {
    workflowId,
    triggerId: '',
    label: workflow?.name ?? 'Run Workflow',
    detail: workflow ? 'Choose a trigger' : 'Choose a published trigger',
  })
}

function selectTrigger(triggerId: string) {
  if (!node.value) return
  const trigger = selectedWorkflow.value?.actions.find((item) => item.id === triggerId)
  emit('configureRunWorkflow', node.value.id, {
    workflowId: runWorkflowData.value.workflowId,
    triggerId,
    actionId: trigger ? createPageActionDefinition(trigger).id : undefined,
    label: trigger?.workflowName ?? selectedWorkflow.value?.name ?? 'Run Workflow',
    detail: trigger ? `${trigger.name} / ${trigger.type}` : 'Choose a trigger',
  })
}

function updateRunWorkflowEventType(eventType: string) {
  if (!node.value) return
  emit('updateRunWorkflowEventType', node.value.id, eventType)
}

function updateRunWorkflowInput(key: string, value: string, type: PageActionInputField['type']) {
  if (!node.value) return
  emit('updateRunWorkflowInput', node.value.id, key, parseInputValue(value, type))
}

async function testRunWorkflow() {
  if (!node.value || !activeAction.value) return
  runWorkflowError.value = ''
  runWorkflowResultJson.value = ''
  runWorkflowStatus.value = 'running'
  const result = await workflowPageActionGateway.runAction({
    action: activeAction.value,
    input: runWorkflowInput.value,
  })
  runWorkflowStatus.value = result.ok ? 'success' : 'error'
  if (!result.ok) {
    runWorkflowError.value = result.error ?? 'Workflow failed.'
    return
  }
  runWorkflowResultJson.value = JSON.stringify(result.data, null, 2)
  emit('testRunWorkflow', node.value.id, result.data)
}

function stringifyInputValue(value: unknown) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function parseInputValue(value: string, type: PageActionInputField['type']): unknown {
  if (type === 'number') return Number(value)
  if (type === 'boolean') return value === 'true'
  if (type === 'object' || type === 'array') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

interface RunWorkflowConfigPayload {
  workflowId: string
  triggerId: string
  actionId?: string
  label: string
  detail: string
}
</script>
