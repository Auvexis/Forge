<template>
  <div class="web-page-blueprint-node-inspector">
    <div class="web-page-blueprint__selection-summary">
      <span class="web-page-blueprint__selection-icon" :data-kind="node.kind">
        <LucideIcon :name="node.icon" :size="17" />
      </span>
      <span>
        <strong>{{ node.label }}</strong>
        <small>{{ nodeKindLabel }}</small>
      </span>
    </div>

    <template v-if="node.kind === 'workflow-action'">
      <section v-if="!activeAction" class="web-page-blueprint__property-section">
        <header>
          <LucideIcon name="workflow" :size="11" />
          <strong>Workflow</strong>
          <button type="button" title="Refresh workflows" @click="actionsStore.loadAvailableActions()">
            <LucideIcon name="refresh-cw" :size="11" />
          </button>
        </header>
        <div v-if="actionsStore.isLoading" class="web-page-blueprint__inspector-state">Loading workflows...</div>
        <div v-else-if="!actionsStore.hasActions" class="web-page-blueprint__inspector-state">No published triggers</div>
        <div v-else class="web-page-blueprint__action-browser">
          <section v-for="workflow in actionsStore.workflows" :key="workflow.id">
            <header>
              <LucideIcon name="folder" :size="11" />
              <strong>{{ workflow.name }}</strong>
              <small>{{ workflow.actions.length }}</small>
            </header>
            <button
              v-for="trigger in workflow.actions"
              :key="trigger.id"
              type="button"
              @click="configureWorkflow(trigger)"
            >
              <LucideIcon :name="trigger.icon || 'play'" :size="13" />
              <span>
                <strong>{{ trigger.name }}</strong>
                <small>{{ trigger.type }}</small>
              </span>
              <LucideIcon name="chevron-right" :size="11" />
            </button>
          </section>
        </div>
      </section>

      <template v-else>
        <section class="web-page-blueprint__property-section">
          <header><LucideIcon name="workflow" :size="11" /><strong>Source</strong></header>
          <dl class="web-page-blueprint__property-list">
            <div><dt>Workflow</dt><dd>{{ activeAction.workflowName }}</dd></div>
            <div><dt>Trigger</dt><dd>{{ activeAction.triggerName }}</dd></div>
            <div><dt>Type</dt><dd>{{ activeAction.triggerType }}</dd></div>
          </dl>
          <button class="web-page-blueprint__property-command" type="button" @click="clearWorkflow">
            <LucideIcon name="replace" :size="11" />
            Change workflow
          </button>
        </section>

        <section class="web-page-blueprint__property-section">
          <header>
            <LucideIcon name="log-in" :size="11" />
            <strong>Inputs</strong>
            <small>{{ activeAction.inputs.length }}</small>
          </header>
          <div v-if="activeAction.inputs.length === 0" class="web-page-blueprint__inspector-state">No inputs</div>
          <label
            v-for="field in activeAction.inputs"
            v-else
            :key="field.key"
            class="web-page-blueprint__field-row"
          >
            <span>{{ field.label }}</span>
            <input
              :type="field.type === 'number' ? 'number' : 'text'"
              :value="String(actionsStore.draftInput[field.key] ?? '')"
              @input="actionsStore.updateInput(field.key, readInputValue($event, field.type))"
            />
          </label>
        </section>

        <section class="web-page-blueprint__property-section">
          <header>
            <LucideIcon name="log-out" :size="11" />
            <strong>Returns</strong>
            <small>{{ activeAction.returns.length }}</small>
          </header>
          <div v-if="activeAction.returns.length === 0" class="web-page-blueprint__inspector-state">No declared returns</div>
          <div
            v-for="field in activeAction.returns"
            v-else
            :key="field.key"
            class="web-page-blueprint__return-row"
            :class="{ 'web-page-blueprint__return-row--bound': returnBindingCount(field.key) > 0 }"
          >
            <span class="web-page-blueprint__return-port" />
            <span class="web-page-blueprint__return-copy">
              <strong>{{ field.label }}</strong>
              <small>{{ field.key }} / {{ resolvedReturnType(field) }}</small>
            </span>
            <span class="web-page-blueprint__return-count">{{ returnBindingCount(field.key) }} links</span>
          </div>
        </section>

        <section class="web-page-blueprint__property-section">
          <header><LucideIcon name="play" :size="11" /><strong>Preview</strong></header>
          <button
            class="web-page-blueprint__run-command"
            type="button"
            :disabled="actionsStore.status === 'running'"
            @click="runWorkflow"
          >
            <LucideIcon :name="actionsStore.status === 'running' ? 'loader-circle' : 'play'" :size="12" />
            {{ actionsStore.status === 'running' ? 'Running' : 'Test node' }}
            <span>{{ actionsStore.status }}</span>
          </button>
          <pre v-if="actionsStore.lastRunResult" class="web-page-blueprint__run-result">{{ formattedRunResult }}</pre>
          <p v-else-if="actionsStore.error" class="web-page-blueprint__run-error">{{ actionsStore.error }}</p>
        </section>
      </template>
    </template>

    <template v-else-if="node.kind === 'element' && elementBlock">
      <section v-if="elementContentProperty" class="web-page-blueprint__property-section">
        <header><LucideIcon name="type" :size="11" /><strong>Content</strong></header>
        <BaseInput
          :model-value="String(elementBlock.props?.[elementContentProperty] ?? '')"
          :label="elementContentProperty === 'value' ? 'Value' : 'Text'"
          @update:model-value="patchElementContent"
        />
      </section>
      <section class="web-page-blueprint__property-section">
        <header>
          <LucideIcon name="waypoints" :size="11" />
          <strong>Dynamic Values</strong>
          <small>{{ elementBindings.length }}</small>
        </header>
        <div v-if="elementBindings.length === 0" class="web-page-blueprint__inspector-state">No bindings</div>
        <div v-for="binding in elementBindings" v-else :key="binding.id" class="web-page-blueprint__element-binding">
          <div>
            <strong>{{ binding.path }}</strong>
            <small>{{ actionLabel(binding.actionId) }} / {{ binding.property }}</small>
          </div>
          <span class="web-page-blueprint__binding-mode">
            <button
              type="button"
              :class="{ 'is-active': binding.mode === 'single' }"
              :disabled="!canUseSingleMode"
              @click="changeElementBindingMode(binding, 'single')"
            >Single</button>
            <button
              type="button"
              :class="{ 'is-active': binding.mode === 'multiple' }"
              @click="changeElementBindingMode(binding, 'multiple')"
            >Multiple</button>
          </span>
          <button type="button" title="Remove binding" @click="removeElementBinding(binding)">
            <LucideIcon name="unlink" :size="11" />
          </button>
        </div>
      </section>
      <section class="web-page-blueprint__property-section">
        <header><LucideIcon name="info" :size="11" /><strong>Element</strong></header>
        <dl class="web-page-blueprint__property-list">
          <div><dt>Type</dt><dd>{{ elementBlock.tag }}</dd></div>
          <div><dt>ID</dt><dd><code>{{ elementBlock.id }}</code></dd></div>
        </dl>
      </section>
    </template>

    <template v-else>
      <section class="web-page-blueprint__property-section">
        <header><LucideIcon name="info" :size="11" /><strong>Node</strong></header>
        <dl class="web-page-blueprint__property-list">
          <div><dt>Name</dt><dd>{{ node.label }}</dd></div>
          <div><dt>Type</dt><dd>{{ nodeKindLabel }}</dd></div>
          <div><dt>ID</dt><dd><code>{{ node.id }}</code></dd></div>
        </dl>
      </section>
      <section v-if="node.detail" class="web-page-blueprint__property-section">
        <header><LucideIcon name="file-text" :size="11" /><strong>Source</strong></header>
        <p class="web-page-blueprint__property-note">{{ node.detail }}</p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import {
  createPageActionDefinition,
  resolvePageActionResultPath,
  type PageActionDefinition,
  type PageActionInputField,
  type PageActionReturnField,
  type PageActionTriggerSummary,
} from '@/core/page-actions'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlock } from '../types/page.types.ts'
import { usePageActionsStore } from '../data-actions/stores/page-actions.store.ts'
import { usePageActionBindingsStore } from '../data-actions/stores/page-action-bindings.store.ts'
import { usePageEditorStore } from '../stores/page-editor.store.ts'
import type { PageBlueprintNode, PageBlueprintScope } from './pageBlueprint.types.ts'

const props = defineProps<{
  node: PageBlueprintNode
  scope: PageBlueprintScope
}>()

const emit = defineEmits<{
  configureWorkflow: [trigger: PageActionTriggerSummary]
  clearWorkflow: []
}>()

const actionsStore = usePageActionsStore()
const bindingsStore = usePageActionBindingsStore()
const editorStore = usePageEditorStore()
const configuredTrigger = computed(() => {
  if (!props.node.workflowId || !props.node.triggerId) return null
  return actionsStore.workflows
    .find((workflow) => workflow.id === props.node.workflowId)
    ?.actions.find((trigger) => trigger.id === props.node.triggerId) ?? null
})
const activeAction = computed<PageActionDefinition | null>(() =>
  configuredTrigger.value ? createPageActionDefinition(configuredTrigger.value) : null,
)
const formattedRunResult = computed(() => JSON.stringify(actionsStore.lastRunResult, null, 2))
const nodeKindLabel = computed(() => props.node.kind === 'workflow-action' ? 'Run Workflow' : props.node.kind)
const elementBlock = computed(() => props.node.elementId ? findBlock(editorStore.blocks, props.node.elementId) : null)
const elementContentProperty = computed<'text' | 'value' | null>(() => {
  if (!elementBlock.value) return null
  if (elementBlock.value.tag === 'input') return 'value'
  return ['text', 'button', 'link'].includes(elementBlock.value.tag) ? 'text' : null
})
const canUseSingleMode = computed(() => Boolean(elementBlock.value && ['text', 'button', 'input'].includes(elementBlock.value.tag)))
const elementBindings = computed<ElementBindingView[]>(() => {
  const elementId = props.node.elementId
  if (!elementId) return []
  const outputs = Object.entries(bindingsStore.outputBindingsByAction).flatMap(([actionId, bindings]) =>
    bindings.filter((binding) => binding.target.elementId === elementId).map((binding) => ({
      id: binding.id,
      actionId,
      path: binding.resultPath,
      property: binding.target.property,
      mode: 'single' as const,
    })),
  )
  const collections = Object.entries(bindingsStore.collectionBindingsByAction).flatMap(([actionId, bindings]) =>
    bindings.filter((binding) => binding.targetElementId === elementId).map((binding) => ({
      id: binding.id,
      actionId,
      path: binding.collectionPath,
      property: 'items',
      mode: 'multiple' as const,
    })),
  )
  return [...outputs, ...collections]
})

onMounted(() => {
  if (actionsStore.workflows.length === 0) void actionsStore.loadAvailableActions()
})

watch(configuredTrigger, (trigger) => {
  if (!trigger) return
  if (actionsStore.selectedAction?.workflowId === trigger.workflowId && actionsStore.selectedAction.triggerId === trigger.id) return
  actionsStore.selectTrigger(trigger)
}, { immediate: true })

function configureWorkflow(trigger: PageActionTriggerSummary) {
  actionsStore.selectTrigger(trigger)
  emit('configureWorkflow', trigger)
}

function clearWorkflow() {
  const action = activeAction.value
  if (action) {
    for (const binding of bindingsStore.outputBindingsForAction(action.id)) {
      bindingsStore.clearOutputBinding(action.id, binding.id)
    }
    for (const binding of bindingsStore.collectionBindingsForAction(action.id)) {
      bindingsStore.clearCollectionBinding(action.id, binding.id)
    }
    bindingsStore.clearActionBindings(action.id)
  }
  actionsStore.clearSelection()
  emit('clearWorkflow')
}

function returnBindingCount(returnKey: string) {
  const action = activeAction.value
  if (!action) return 0
  return bindingsStore.outputBindingsForAction(action.id).filter((binding) => binding.resultPath === returnKey).length
    + bindingsStore.collectionBindingsForAction(action.id).filter((binding) => binding.collectionPath === returnKey).length
}

function resolvedReturnType(field: PageActionReturnField) {
  const action = activeAction.value
  return action ? actionsStore.resolvedReturnType(action.id, field.key, field.type) : field.type
}

async function runWorkflow() {
  const trigger = configuredTrigger.value
  if (!trigger) return
  if (actionsStore.selectedAction?.workflowId !== trigger.workflowId || actionsStore.selectedAction.triggerId !== trigger.id) {
    actionsStore.selectTrigger(trigger)
  }
  const result = await actionsStore.runSelectedAction()
  if (!result?.ok || !activeAction.value) return
  for (const binding of bindingsStore.outputBindingsForAction(activeAction.value.id)) {
    const value = resolvePageActionResultPath(result.data, binding.resultPath)
    if (value === undefined) continue
    const block = findBlock(editorStore.blocks, binding.target.elementId)
    if (!block) continue
    const property = binding.target.property === 'value' ? 'value' : binding.target.property === 'checked' ? 'checked' : 'text'
    editorStore.patchBlock(block.id, {
      props: {
        ...(block.props ?? {}),
        [property]: property === 'checked' ? Boolean(value) : stringifyValue(value),
      },
    })
  }
}

function stringifyValue(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value == null) return ''
  return JSON.stringify(value)
}

function readInputValue(event: Event, type: PageActionInputField['type']) {
  const value = (event.target as HTMLInputElement).value
  if (type === 'number') return Number(value)
  if (type === 'boolean') return value === 'true'
  return value
}

function patchElementContent(value: string | boolean) {
  const block = elementBlock.value
  const property = elementContentProperty.value
  if (!block || !property) return
  editorStore.patchBlock(block.id, { props: { ...(block.props ?? {}), [property]: String(value) } })
}

function actionForId(actionId: string) {
  for (const workflow of actionsStore.workflows) {
    for (const trigger of workflow.actions) {
      const action = createPageActionDefinition(trigger)
      if (action.id === actionId) return action
    }
  }
  return null
}

function actionLabel(actionId: string) {
  return actionForId(actionId)?.workflowName ?? actionId
}

function changeElementBindingMode(binding: ElementBindingView, mode: 'single' | 'multiple') {
  if (binding.mode === mode || !elementBlock.value) return
  const action = actionForId(binding.actionId)
  if (!action) return
  removeElementBinding(binding)
  if (mode === 'multiple') {
    bindingsStore.bindCollectionToElement(action, binding.path, elementBlock.value.id, 'repeater')
    return
  }
  if (!canUseSingleMode.value) return
  const property = elementBlock.value.tag === 'input'
    ? (elementBlock.value.props?.type === 'checkbox' ? 'checked' as const : 'value' as const)
    : 'text' as const
  bindingsStore.bindOutputToElement(action, binding.path, {
    elementId: elementBlock.value.id,
    property,
    label: String(elementBlock.value.props?.label ?? elementBlock.value.props?.text ?? elementBlock.value.id),
  })
}

function removeElementBinding(binding: ElementBindingView) {
  if (binding.mode === 'single') bindingsStore.clearOutputBinding(binding.actionId, binding.id)
  else bindingsStore.clearCollectionBinding(binding.actionId, binding.id)
}

function findBlock(blocks: PageBlock[], id: string): PageBlock | null {
  for (const block of blocks) {
    if (block.id === id) return block
    const child = findBlock(block.children ?? [], id)
    if (child) return child
  }
  return null
}

interface ElementBindingView {
  id: string
  actionId: string
  path: string
  property: string
  mode: 'single' | 'multiple'
}

</script>
