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
            :class="{ 'web-page-blueprint__return-row--bound': isReturnBound(field.key) }"
          >
            <span class="web-page-blueprint__return-port" />
            <span class="web-page-blueprint__return-copy">
              <strong>{{ field.label }}</strong>
              <small>{{ field.key }} / {{ field.type }}</small>
            </span>
            <button
              v-if="isReturnBound(field.key)"
              type="button"
              :title="`Remove binding from ${targetLabel}`"
              @click="unbindReturn(field.key)"
            >
              <LucideIcon name="unlink" :size="12" />
              Bound
            </button>
            <button
              v-else
              type="button"
              :disabled="!canBindReturn(field.type)"
              :title="bindTitle(field.type)"
              @click="bindReturn(field.key, field.type)"
            >
              <LucideIcon name="link-2" :size="12" />
              Bind
            </button>
          </div>
          <label class="web-page-blueprint__binding-target">
            <span>Target</span>
            <select v-model="selectedTargetId">
              <option value="" disabled>Select element</option>
              <option v-for="target in availableTargets" :key="target.id" :value="target.id">
                {{ target.label }}
              </option>
            </select>
          </label>
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
import { computed, onMounted, ref, watch } from 'vue'
import {
  createPageActionDefinition,
  resolvePageActionResultPath,
  type PageActionCollectionBinding,
  type PageActionDefinition,
  type PageActionInputField,
  type PageActionOutputBinding,
  type PageActionReturnField,
  type PageActionTriggerSummary,
} from '@/core/page-actions'
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
  outputBound: [binding: PageActionOutputBinding]
  outputUnbound: [bindingId: string]
  collectionBound: [binding: PageActionCollectionBinding]
  collectionUnbound: [bindingId: string]
}>()

const actionsStore = usePageActionsStore()
const bindingsStore = usePageActionBindingsStore()
const editorStore = usePageEditorStore()
const selectedTargetId = ref(props.scope.type === 'element' ? props.scope.elementId : editorStore.selectedBlockId ?? '')

const configuredTrigger = computed(() => {
  if (!props.node.workflowId || !props.node.triggerId) return null
  return actionsStore.workflows
    .find((workflow) => workflow.id === props.node.workflowId)
    ?.actions.find((trigger) => trigger.id === props.node.triggerId) ?? null
})
const activeAction = computed<PageActionDefinition | null>(() =>
  configuredTrigger.value ? createPageActionDefinition(configuredTrigger.value) : null,
)
const targetBlock = computed(() => {
  return selectedTargetId.value ? findBlock(editorStore.blocks, selectedTargetId.value) : null
})
const availableTargets = computed(() => collectBindableBlocks(editorStore.blocks))
const scalarTarget = computed(() => {
  const block = targetBlock.value
  if (!block || !['text', 'button', 'input'].includes(block.tag)) return null
  const property = block.tag === 'input'
    ? (block.props?.type === 'checkbox' ? 'checked' as const : 'value' as const)
    : 'text' as const
  return {
    elementId: block.id,
    property,
    label: String(block.props?.label ?? block.props?.text ?? block.elementId ?? block.id),
  }
})
const collectionTarget = computed(() => {
  const block = targetBlock.value
  return block && ['header', 'section', 'div', 'footer', 'form'].includes(block.tag) ? block.id : null
})
const targetLabel = computed(() => {
  if (scalarTarget.value) return `${scalarTarget.value.label}.${scalarTarget.value.property}`
  if (collectionTarget.value) return `${collectionTarget.value}.items`
  return 'Select a compatible element in Design'
})
const formattedRunResult = computed(() => JSON.stringify(actionsStore.lastRunResult, null, 2))
const nodeKindLabel = computed(() => props.node.kind === 'workflow-action' ? 'Run Workflow' : props.node.kind)

onMounted(() => {
  if (actionsStore.workflows.length === 0) void actionsStore.loadAvailableActions()
})

watch(configuredTrigger, (trigger) => {
  if (!trigger) return
  if (actionsStore.selectedAction?.workflowId === trigger.workflowId && actionsStore.selectedAction.triggerId === trigger.id) return
  actionsStore.selectTrigger(trigger)
}, { immediate: true })

watch(availableTargets, (targets) => {
  if (targets.some((target) => target.id === selectedTargetId.value)) return
  selectedTargetId.value = targets[0]?.id ?? ''
}, { immediate: true })

function configureWorkflow(trigger: PageActionTriggerSummary) {
  actionsStore.selectTrigger(trigger)
  const block = targetBlock.value
  if (block && ['button', 'form'].includes(block.tag)) {
    editorStore.patchBlock(block.id, {
      action: {
        id: createPageActionDefinition(trigger).id,
        type: 'triggerWorkflow',
        workflowId: trigger.workflowId,
        triggerId: trigger.id,
      },
    })
  }
  emit('configureWorkflow', trigger)
}

function clearWorkflow() {
  const action = activeAction.value
  if (action) {
    for (const binding of bindingsStore.outputBindingsForAction(action.id)) {
      bindingsStore.clearOutputBinding(action.id, binding.id)
      emit('outputUnbound', binding.id)
    }
    for (const binding of bindingsStore.collectionBindingsForAction(action.id)) {
      bindingsStore.clearCollectionBinding(action.id, binding.id)
      emit('collectionUnbound', binding.id)
    }
    bindingsStore.clearActionBindings(action.id)
  }
  actionsStore.clearSelection()
  emit('clearWorkflow')
}

function outputBinding(returnKey: string) {
  const action = activeAction.value
  if (!action) return null
  return bindingsStore.outputBindingsForAction(action.id)
    .find((binding) => binding.resultPath === returnKey && binding.target.elementId === scalarTarget.value?.elementId) ?? null
}

function collectionBinding(returnKey: string) {
  const action = activeAction.value
  if (!action) return null
  return bindingsStore.collectionBindingsForAction(action.id)
    .find((binding) => binding.collectionPath === returnKey && binding.targetElementId === collectionTarget.value) ?? null
}

function isReturnBound(returnKey: string) {
  return Boolean(outputBinding(returnKey) || collectionBinding(returnKey))
}

function canBindReturn(type: PageActionReturnField['type']) {
  return type === 'array'
    ? Boolean(collectionTarget.value || scalarTarget.value)
    : Boolean(scalarTarget.value || collectionTarget.value)
}

function bindTitle(type: PageActionReturnField['type']) {
  if (canBindReturn(type)) return `Bind to ${targetLabel.value}`
  return type === 'array' ? 'Select a container, text, button, or input in Design' : 'Select a text, button, or input in Design'
}

function bindReturn(returnKey: string, type: PageActionReturnField['type']) {
  const action = activeAction.value
  if (!action) return
  if (collectionTarget.value && (type === 'array' || !scalarTarget.value)) {
    const binding = bindingsStore.bindCollectionToElement(action, returnKey, collectionTarget.value, 'repeater')
    if (binding) emit('collectionBound', binding)
    return
  }
  if (!scalarTarget.value) return
  const binding = bindingsStore.bindOutputToElement(action, returnKey, scalarTarget.value)
  if (binding) emit('outputBound', binding)
}

function unbindReturn(returnKey: string) {
  const action = activeAction.value
  if (!action) return
  const output = outputBinding(returnKey)
  if (output) {
    bindingsStore.clearOutputBinding(action.id, output.id)
    emit('outputUnbound', output.id)
  }
  const collection = collectionBinding(returnKey)
  if (collection) {
    bindingsStore.clearCollectionBinding(action.id, collection.id)
    emit('collectionUnbound', collection.id)
  }
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

function findBlock(blocks: PageBlock[], id: string): PageBlock | null {
  for (const block of blocks) {
    if (block.id === id) return block
    const child = findBlock(block.children ?? [], id)
    if (child) return child
  }
  return null
}

function collectBindableBlocks(blocks: PageBlock[]) {
  const targets: Array<{ id: string; label: string }> = []
  const visit = (items: PageBlock[]) => {
    for (const block of items) {
      if (['text', 'button', 'input', 'header', 'section', 'div', 'footer', 'form'].includes(block.tag)) {
        const name = String(block.props?.label ?? block.props?.text ?? block.elementId ?? block.id)
        targets.push({ id: block.id, label: `${name} / ${block.tag}` })
      }
      visit(block.children ?? [])
    }
  }
  visit(blocks)
  return targets
}
</script>
