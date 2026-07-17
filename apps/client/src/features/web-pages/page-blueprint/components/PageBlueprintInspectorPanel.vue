<template>
  <div class="web-page-blueprint-inspector">
    <p v-if="!selectedNodeId" class="web-page-editor__empty">Select a Blueprint node.</p>

    <template v-else>
      <template v-if="selectedElement">
        <BaseInspectorSection title="Node" icon="box">
          <BaseInspectorRow label="ID" :value="selectedNodeId" />
          <BaseInspectorRow label="Kind" value="element" />
          <BaseInspectorRow label="Label" :value="selectedElement.label" />
          <BaseInspectorRow label="Type" :value="selectedElement.tag" />
        </BaseInspectorSection>

        <BaseInspectorSection title="HTML Properties" :icon="selectedElementIcon">
          <BaseInspectorRow label="Element ID" :value="selectedElement.id" />
          <BaseInspectorRow label="Tag" :value="selectedElement.tag" />
          <BaseInspectorRow label="Class" :value="selectedElement.className || '-'" />
          <BaseInspectorRow
            v-for="field in selectedElementFields"
            :key="field.id"
            :label="field.label"
            :value="field.value ?? ''"
            :placeholder="field.type"
          />
        </BaseInspectorSection>

        <BaseInspectorSection title="Events" icon="mouse-pointer-click">
          <template #actions>
            <BaseInspectorButton label="Add Event" icon="plus" @click="$emit('addElementEvent', selectedElementNodeId)" />
          </template>
          <div
            v-for="field in selectedElementEventFields"
            :key="field.id"
            class="web-page-blueprint-inspector-event"
          >
            <BaseInspectorSelect
              label="Type"
              :model-value="field.value ?? 'click'"
              :options="elementEventTypeOptions"
              @update:model-value="$emit('updateElementEventType', selectedElementNodeId, field.id, $event)"
            />
            <BaseInspectorRow
              label="Connection"
              :value="field.expression ?? 'Waiting connection'"
              placeholder="event"
            />
            <div class="web-page-blueprint-inspector-actions">
              <BaseInspectorButton
                label="Remove"
                icon="trash-2"
                variant="danger"
                @click="$emit('removeElementEvent', selectedElementNodeId, field.id)"
              />
            </div>
          </div>
          <p v-if="selectedElementEventFields.length === 0" class="web-page-blueprint-inspector-empty">
            No events.
          </p>
        </BaseInspectorSection>
      </template>

      <template v-else>
      <BaseInspectorSection v-if="node?.type !== 'run-workflow'" title="Node" icon="box">
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

      <BaseInspectorSection v-if="node && node.type !== 'run-workflow'" title="Fields" icon="list-tree">
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
        <div class="web-page-blueprint-inspector-stack">
          <header class="web-page-blueprint-inspector-stack__nav">
            <button
              v-if="runWorkflowView !== 'workflows'"
              class="web-page-blueprint-inspector-stack__back"
              type="button"
              aria-label="Back"
              @click="goBackRunWorkflowView"
            >
              <LucideIcon name="chevron-left" :size="14" />
            </button>
            <div>
              <strong>{{ runWorkflowViewTitle }}</strong>
              <small>{{ runWorkflowViewSubtitle }}</small>
            </div>
          </header>

          <Transition :name="runWorkflowTransition" mode="out-in">
            <div :key="runWorkflowView" class="web-page-blueprint-inspector-stack__view">
              <template v-if="runWorkflowView === 'workflows'">
                <BaseInspectorSection title="Published Workflows" icon="workflow">
                  <template #actions>
                    <BaseInspectorButton label="Refresh" icon="refresh-cw" @click="loadWorkflows" />
                  </template>
                  <button
                    v-for="workflow in workflows"
                    :key="workflow.id"
                    class="web-page-blueprint-inspector-choice"
                    type="button"
                    @click="selectWorkflow(workflow.id)"
                  >
                    <span>
                      <strong>{{ workflow.name }}</strong>
                      <small>{{ workflow.actions.length }} triggers</small>
                    </span>
                    <LucideIcon name="chevron-right" :size="14" />
                  </button>
                  <p v-if="workflows.length === 0" class="web-page-blueprint-inspector-empty">
                    No published workflows.
                  </p>
                </BaseInspectorSection>
              </template>

              <template v-else-if="runWorkflowView === 'triggers'">
                <BaseInspectorSection title="Triggers" icon="git-branch">
                  <button
                    v-for="trigger in selectedWorkflow?.actions ?? []"
                    :key="trigger.id"
                    class="web-page-blueprint-inspector-choice"
                    type="button"
                    @click="selectTrigger(trigger.id)"
                  >
                    <span>
                      <strong>{{ trigger.name }}</strong>
                      <small>{{ trigger.type }}</small>
                    </span>
                    <LucideIcon name="chevron-right" :size="14" />
                  </button>
                  <p v-if="!selectedWorkflow" class="web-page-blueprint-inspector-empty">
                    Choose a workflow first.
                  </p>
                  <p
                    v-else-if="selectedWorkflow.actions.length === 0"
                    class="web-page-blueprint-inspector-empty"
                  >
                    No triggers.
                  </p>
                </BaseInspectorSection>
              </template>

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

                <BaseInspectorSection title="Source" icon="workflow">
                  <BaseInspectorRow label="Workflow" :value="selectedWorkflow?.name ?? 'None'" />
                  <BaseInspectorRow label="Trigger" :value="selectedTrigger?.name ?? 'None'" />
                  <BaseInspectorRow label="Trigger Type" :value="activeAction?.triggerType ?? '-'" />
                </BaseInspectorSection>

                <BaseInspectorSection v-if="activeAction" title="Properties" icon="sliders-horizontal">
                  <BaseInspectorSelect
                    label="Event"
                    :model-value="runWorkflowData.eventType"
                    :options="eventTypeOptions"
                    @update:model-value="updateRunWorkflowEventType"
                  />
                  <BaseInspectorRow label="Action" :value="activeAction.name" />
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

                <BaseInspectorSection title="Outputs" icon="log-out">
                  <BaseInspectorRow
                    v-for="field in runWorkflowOutputFields"
                    :key="field.id"
                    :label="field.label"
                    :value="field.type"
                  />
                  <p v-if="runWorkflowOutputFields.length === 0" class="web-page-blueprint-inspector-empty">
                    Run Test to generate outputs.
                  </p>
                </BaseInspectorSection>

                <BaseInspectorSection v-if="!activeAction" title="Properties" icon="sliders-horizontal">
                  <p class="web-page-blueprint-inspector-empty">
                    Choose a trigger first.
                  </p>
                </BaseInspectorSection>
              </template>
            </div>
          </Transition>
        </div>
      </template>
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
  type PageActionWorkflowSummary,
  workflowPageActionGateway,
} from '@/core/page-actions'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlock } from '../../types/page.types.ts'
import type { PageBlueprintDocument } from '../pageBlueprintDocument.ts'
import { createElementFields } from '../pageBlueprintFields.ts'
import { pageBlockIcon } from '../pageBlueprintGroups.ts'
import { createPageBlueprintViewModel } from '../pageBlueprintViewModel.ts'
import BaseInspectorButton from './BaseInspectorButton.vue'
import BaseInspectorRow from './BaseInspectorRow.vue'
import BaseInspectorSection from './BaseInspectorSection.vue'
import BaseInspectorSelect from './BaseInspectorSelect.vue'

const props = defineProps<{
  blocks: PageBlock[]
  document: PageBlueprintDocument
  selectedNodeId: string | null
  workflows: PageActionWorkflowSummary[]
}>()

const emit = defineEmits<{
  updateNodeLabel: [nodeId: string, label: string]
  updateFieldValue: [nodeId: string, fieldId: string, value: string]
  addNodeField: [nodeId: string]
  addElementEvent: [nodeId: string]
  updateElementEventType: [nodeId: string, fieldId: string, eventType: string]
  removeElementEvent: [nodeId: string, fieldId: string]
  configureRunWorkflow: [nodeId: string, payload: RunWorkflowConfigPayload]
  updateRunWorkflowEventType: [nodeId: string, eventType: string]
  updateRunWorkflowInput: [nodeId: string, key: string, value: unknown]
  testRunWorkflow: [nodeId: string, result: unknown]
  refreshWorkflows: []
}>()

const node = computed(() => props.document.nodes.find((item) => item.id === props.selectedNodeId))
const selectedElementId = computed(() =>
  props.selectedNodeId?.startsWith('blueprint-element:')
    ? props.selectedNodeId.slice('blueprint-element:'.length)
    : '',
)
const selectedElementNodeId = computed(() => props.selectedNodeId ?? '')
const elementModel = computed(() => createPageBlueprintViewModel({
  blocks: props.blocks,
  workflows: [],
  outputBindings: {},
  collectionBindings: {},
}))
const selectedElement = computed(() =>
  elementModel.value.elements.find((element) => element.id === selectedElementId.value) ?? null,
)
const selectedElementIcon = computed(() => selectedElement.value ? pageBlockIcon(selectedElement.value.tag) : 'box')
const selectedElementFields = computed(() => selectedElement.value ? createElementFields(selectedElement.value) : [])
const selectedElementEventFields = computed(() =>
  node.value?.kind === 'element' ? node.value.fields.filter((field) => field.type === 'event') : [],
)
const runWorkflowOutputFields = computed(() =>
  node.value?.type === 'run-workflow' ? node.value.fields.filter((field) => field.id !== 'event') : [],
)
const runWorkflowError = ref('')
const runWorkflowResultJson = ref('')
const runWorkflowStatus = ref<PageActionRunStatus>('idle')
const runWorkflowTransition = ref('web-page-blueprint-inspector-slide-forward')
const runWorkflowView = ref<RunWorkflowInspectorView>('workflows')
const eventTypeOptions = [
  { label: 'Click', value: 'click' },
  { label: 'Change', value: 'change' },
  { label: 'Submit', value: 'submit' },
  { label: 'Mount', value: 'mount' },
]
const elementEventTypeOptions = [
  { label: 'Click', value: 'click' },
  { label: 'Change', value: 'change' },
  { label: 'Input', value: 'input' },
  { label: 'Submit', value: 'submit' },
  { label: 'Mount', value: 'mount' },
]

onMounted(loadWorkflows)

const inferredKind = computed(() => {
  if (props.selectedNodeId?.startsWith('blueprint-element:')) return 'element'
  if (props.selectedNodeId?.startsWith('blueprint-workflow:')) return 'workflow'
  if (props.selectedNodeId?.startsWith('blueprint-binding:')) return 'binding'
  return 'node'
})
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
const runWorkflowViewTitle = computed(() => {
  if (runWorkflowView.value === 'triggers') return 'Choose Trigger'
  if (runWorkflowView.value === 'properties') return 'Run Workflow'
  return 'Choose Workflow'
})
const runWorkflowViewSubtitle = computed(() => {
  if (runWorkflowView.value === 'triggers') return selectedWorkflow.value?.name ?? 'Select a workflow first'
  if (runWorkflowView.value === 'properties') return selectedTrigger.value?.name ?? 'Configure action'
  return 'Published workflow source'
})

watch(node, (nextNode) => {
  runWorkflowError.value = ''
  runWorkflowStatus.value = 'idle'
  const savedJson = nextNode?.data?.testResultJson
  runWorkflowResultJson.value = typeof savedJson === 'string' ? savedJson : ''
  runWorkflowTransition.value = 'web-page-blueprint-inspector-slide-forward'
  runWorkflowView.value = getInitialRunWorkflowView()
}, { immediate: true })

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
  navigateRunWorkflowView('triggers', 'forward')
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
  navigateRunWorkflowView('properties', 'forward')
}

function goBackRunWorkflowView() {
  if (runWorkflowView.value === 'properties') {
    navigateRunWorkflowView('triggers', 'backward')
    return
  }
  if (runWorkflowView.value === 'triggers') navigateRunWorkflowView('workflows', 'backward')
}

function navigateRunWorkflowView(view: RunWorkflowInspectorView, direction: 'forward' | 'backward') {
  runWorkflowTransition.value = direction === 'forward'
    ? 'web-page-blueprint-inspector-slide-forward'
    : 'web-page-blueprint-inspector-slide-backward'
  runWorkflowView.value = view
}

function getInitialRunWorkflowView(): RunWorkflowInspectorView {
  if (node.value?.type !== 'run-workflow') return 'workflows'
  if (runWorkflowData.value.workflowId && runWorkflowData.value.triggerId) return 'properties'
  if (runWorkflowData.value.workflowId) return 'triggers'
  return 'workflows'
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

type RunWorkflowInspectorView = 'workflows' | 'triggers' | 'properties'
</script>
