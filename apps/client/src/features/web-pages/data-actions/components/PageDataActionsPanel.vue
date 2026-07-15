<template>
  <section class="web-page-data-actions">
    <header class="web-page-data-actions__header">
      <div>
        <strong>Data / Actions</strong>
        <span>{{ actionCountLabel }}</span>
      </div>
      <BaseButton
        variant="ghost"
        size="icon"
        icon-left="refresh-cw"
        title="Refresh actions"
        :loading="store.isLoading"
        @click="store.loadAvailableActions()"
      />
    </header>

    <p v-if="store.error" class="web-page-data-actions__error">{{ store.error }}</p>

    <div v-if="!store.hasActions && !store.isLoading" class="web-page-data-actions__empty">
      Publish a workflow with manual, form, or webhook triggers to use it as a Page Action.
    </div>

    <div v-else class="web-page-data-actions__body">
      <section class="web-page-data-actions__catalog" aria-label="Available workflow actions">
        <div class="web-page-data-actions__section-title">
          <strong>Actions</strong>
          <span>{{ store.workflows.length }} workflows</span>
        </div>
        <article
          v-for="workflow in store.workflows"
          :key="workflow.id"
          class="web-page-data-actions__workflow"
        >
          <h4>
            <LucideIcon name="folder" :size="12" />
            <span>{{ workflow.name }}</span>
          </h4>
          <button
            v-for="action in workflow.actions"
            :key="action.id"
            type="button"
            class="web-page-data-actions__action"
            :class="{ 'web-page-data-actions__action--active': isSelectedTrigger(action) }"
            @click="store.selectTrigger(action)"
          >
            <LucideIcon :name="action.icon || 'workflow'" :size="14" />
            <span>
              {{ action.name }}
              <small>{{ action.type }}</small>
            </span>
            <LucideIcon name="chevron-right" :size="12" />
          </button>
        </article>
      </section>

      <section v-if="!store.selectedAction" class="web-page-data-actions__details web-page-data-actions__details--empty">
        <LucideIcon name="mouse-pointer-click" :size="18" />
        <strong>Select a workflow trigger</strong>
        <span>Choose an action to configure inputs, result bindings, collections, and item-scoped actions.</span>
      </section>

      <section v-else class="web-page-data-actions__details">
        <header class="web-page-data-actions__selected">
          <div>
            <strong>{{ store.selectedAction.name }}</strong>
            <span>{{ selectedActionSubtitle }}</span>
          </div>
          <BaseButton
            variant="ghost"
            size="icon"
            icon-left="x"
            title="Clear selected action"
            @click="store.clearSelection()"
          />
        </header>

        <nav class="web-page-data-actions__tabs" aria-label="Action configuration">
          <button
            v-for="tab in configTabs"
            :key="tab.id"
            type="button"
            class="web-page-data-actions__tab"
            :class="{ 'web-page-data-actions__tab--active': activeConfigTab === tab.id }"
            @click="activeConfigTab = tab.id"
          >
            <LucideIcon :name="tab.icon" :size="13" />
            <span>{{ tab.label }}</span>
            <code>{{ tab.meta }}</code>
          </button>
        </nav>

        <div v-if="activeConfigTab === 'target'" class="web-page-data-actions__module">
          <div class="web-page-data-actions__module-header">
            <strong>Run Target</strong>
            <span>Attach this action to a selected button or form.</span>
          </div>
          <div class="web-page-data-actions__target-row">
            <LucideIcon name="mouse-pointer-click" :size="14" />
            <span>
              {{ attachTargetLabel }}
              <small>{{ attachTargetHint }}</small>
            </span>
            <BaseButton
              variant="ghost"
              size="sm"
              :icon-left="isSelectedActionAttached ? 'check' : 'link'"
              :disabled="!canAttachSelectedAction"
              @click="attachSelectedAction"
            >
              {{ isSelectedActionAttached ? 'Attached' : 'Attach' }}
            </BaseButton>
          </div>
        </div>

        <div v-if="activeConfigTab === 'inputs'" class="web-page-data-actions__module">
          <div class="web-page-data-actions__module-header">
            <strong>Inputs</strong>
            <span>Use static values, page fields, or current collection item.</span>
          </div>
          <div v-if="store.selectedAction.inputs.length === 0" class="web-page-data-actions__hint">
            This trigger has no declared inputs.
          </div>
          <div
            v-for="field in store.selectedAction.inputs"
            :key="field.key"
            class="web-page-data-actions__field"
          >
            <label>
              <span>
                {{ field.label }}
                <small v-if="field.required">required</small>
              </span>
              <input
                :value="String(store.draftInput[field.key] ?? '')"
                :type="field.type === 'number' ? 'number' : 'text'"
                @input="store.updateInput(field.key, readInputValue($event, field.type))"
              />
            </label>
            <div class="web-page-data-actions__binding-tools">
              <button
                type="button"
                class="web-page-data-actions__bind-handle"
                :class="{ 'web-page-data-actions__bind-handle--active': Boolean(bindingFor(field.key)) }"
                :title="inputBindingTitle(field.key)"
                @pointerdown="startBindingDrag($event, field)"
              >
                <LucideIcon name="circle-dot-dashed" :size="14" />
                Pick element
              </button>
              <div class="web-page-data-actions__scope-row">
                <input
                  :value="scopeInputPath(field.key)"
                  placeholder="item.id"
                  @input="updateScopeInputPath(field.key, ($event.target as HTMLInputElement).value)"
                />
                <BaseButton
                  variant="ghost"
                  size="sm"
                  icon-left="braces"
                  :disabled="!scopeInputPath(field.key).trim()"
                  @click="bindScopeInput(field.key)"
                >
                  Scope
                </BaseButton>
              </div>
            </div>
            <div v-if="bindingFor(field.key)" class="web-page-data-actions__binding-chip">
              <LucideIcon :name="bindingFor(field.key)?.source === 'scope' ? 'braces' : 'link-2'" :size="12" />
              <span>
                {{ bindingLabel(field.key) }}
                <small>{{ bindingFor(field.key)?.source }}</small>
              </span>
              <button type="button" title="Remove binding" @click="clearBinding(field.key)">
                <LucideIcon name="x" :size="12" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeConfigTab === 'outputs'" class="web-page-data-actions__module">
          <div class="web-page-data-actions__module-header">
            <strong>Result Bindings</strong>
            <span>Bind a returned value into the selected text, button, or input.</span>
          </div>
          <div class="web-page-data-actions__output-row">
            <input v-model="outputResultPath" placeholder="executionId" list="page-action-return-fields" />
            <datalist id="page-action-return-fields">
              <option v-for="field in store.selectedAction.returns" :key="field.key" :value="field.key" />
            </datalist>
            <BaseButton
              variant="ghost"
              size="sm"
              icon-left="corner-down-right"
              :disabled="!canBindOutput"
              @click="bindOutputToSelectedElement"
            >
              Bind
            </BaseButton>
          </div>
          <div v-if="store.selectedAction.returns.length" class="web-page-data-actions__return-fields">
            <button
              v-for="field in store.selectedAction.returns"
              :key="field.key"
              type="button"
              :class="{ 'web-page-data-actions__return-field--active': outputResultPath === field.key }"
              @click="outputResultPath = field.key"
            >
              <span>{{ field.label }}</span>
              <small>{{ field.key }}</small>
            </button>
          </div>
          <div v-if="outputBindings.length === 0" class="web-page-data-actions__hint">
            Select an element in the canvas, choose a result path, then bind it.
          </div>
          <div v-for="binding in outputBindings" :key="binding.id" class="web-page-data-actions__binding-chip">
            <LucideIcon name="arrow-right-left" :size="12" />
            <span>
              {{ binding.resultPath }} -> {{ binding.target.label }}
              <small>{{ binding.target.property }}</small>
            </span>
            <button type="button" title="Remove output binding" @click="clearOutputBinding(binding.id)">
              <LucideIcon name="x" :size="12" />
            </button>
          </div>
        </div>

        <div v-if="activeConfigTab === 'collections'" class="web-page-data-actions__module">
          <div class="web-page-data-actions__module-header">
            <strong>Collections</strong>
            <span>Bind an array into a selected container as repeater or table.</span>
          </div>
          <div class="web-page-data-actions__output-row">
            <input v-model="collectionResultPath" placeholder="fruits" list="page-action-return-fields" />
            <BaseButton
              variant="ghost"
              size="sm"
              icon-left="repeat"
              :disabled="!canBindCollection"
              @click="bindCollectionToSelectedElement"
            >
              Repeat
            </BaseButton>
            <BaseButton
              variant="ghost"
              size="sm"
              icon-left="table-2"
              :disabled="!canBindCollection"
              @click="bindTableToSelectedElement"
            >
              Table
            </BaseButton>
          </div>
          <div v-if="collectionBindings.length === 0" class="web-page-data-actions__hint">
            Select a container before binding a collection.
          </div>
          <div v-for="binding in collectionBindings" :key="binding.id" class="web-page-data-actions__binding-chip">
            <LucideIcon name="repeat" :size="12" />
            <span>
              {{ binding.collectionPath }} -> {{ binding.targetElementId }}
              <small>{{ binding.mode ?? 'repeater' }}</small>
            </span>
            <button type="button" title="Remove collection binding" @click="clearCollectionBinding(binding.id)">
              <LucideIcon name="x" :size="12" />
            </button>
          </div>
        </div>

        <div v-if="activeConfigTab === 'test'" class="web-page-data-actions__module web-page-data-actions__module--run">
          <div>
            <strong>Test action</strong>
            <span>{{ testRunHint }}</span>
          </div>
          <BaseButton
            variant="primary"
            size="sm"
            icon-left="play"
            :loading="store.status === 'running'"
            @click="runSelectedAction"
          >
            Test Run
          </BaseButton>
          <pre v-if="store.lastRunResult" class="web-page-data-actions__result">{{ formattedResult }}</pre>
        </div>
      </section>
    </div>
    <PageActionPickWhipOverlay />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import PageActionPickWhipOverlay from './PageActionPickWhipOverlay.vue'
import { usePageEditorStore } from '../../stores/page-editor.store.ts'
import { usePageActionsStore } from '../stores/page-actions.store'
import { usePageActionBindingsStore } from '../stores/page-action-bindings.store'
import { readPageActionBindingTargetAtPoint, readPageActionBindingTargetValue } from '../utils/bindingTargetDom'
import type { PageBlock } from '../../types/page.types.ts'
import {
  resolvePageActionInputBindings,
  resolvePageActionResultPath,
  type PageActionElementBindingTarget,
  type PageActionInputField,
  type PageActionOutputBinding,
  type PageActionTriggerSummary,
} from '@/core/page-actions'

const store = usePageActionsStore()
const bindingStore = usePageActionBindingsStore()
const editorStore = usePageEditorStore()
const outputResultPath = ref('executionId')
const collectionResultPath = ref('fruits')
const scopedInputPaths = ref<Record<string, string>>({})
const activeConfigTab = ref<'target' | 'inputs' | 'outputs' | 'collections' | 'test'>('target')

const actionCountLabel = computed(() => {
  const count = store.workflows.reduce((total, workflow) => total + workflow.actions.length, 0)
  return count === 1 ? '1 action' : `${count} actions`
})
const formattedResult = computed(() => JSON.stringify(store.lastRunResult, null, 2))
const outputBindings = computed(() => bindingStore.outputBindingsForAction(store.selectedAction?.id))
const collectionBindings = computed(() => bindingStore.collectionBindingsForAction(store.selectedAction?.id))
const configTabs = computed(() => [
  {
    id: 'target' as const,
    label: 'Target',
    icon: isSelectedActionAttached.value ? 'check-circle-2' : 'mouse-pointer-click',
    meta: isSelectedActionAttached.value ? 'linked' : 'idle',
  },
  {
    id: 'inputs' as const,
    label: 'Inputs',
    icon: 'sliders-horizontal',
    meta: `${store.selectedAction?.inputs.length ?? 0}`,
  },
  {
    id: 'outputs' as const,
    label: 'Outputs',
    icon: 'corner-down-right',
    meta: `${outputBindings.value.length}`,
  },
  {
    id: 'collections' as const,
    label: 'Lists',
    icon: 'table-2',
    meta: `${collectionBindings.value.length}`,
  },
  {
    id: 'test' as const,
    label: 'Test',
    icon: store.status === 'error' ? 'circle-alert' : store.status === 'success' ? 'circle-check' : 'play',
    meta: store.status,
  },
])
const selectedActionSubtitle = computed(() =>
  store.selectedAction ? `${store.selectedAction.workflowName} / ${store.selectedAction.triggerType}` : '',
)
const testRunHint = computed(() => {
  if (store.status === 'success') return 'Last run completed.'
  if (store.status === 'error') return 'Last run failed. Check the response below.'
  return 'Runs with the current input values and element bindings.'
})
const canAttachSelectedAction = computed(() =>
  Boolean(store.selectedAction && editorStore.selectedBlock && ['button', 'form'].includes(editorStore.selectedBlock.tag)),
)
const isSelectedActionAttached = computed(() =>
  Boolean(store.selectedAction && editorStore.selectedBlock?.action?.id === store.selectedAction.id),
)
const canBindOutput = computed(() =>
  Boolean(store.selectedAction && outputResultPath.value.trim() && selectedOutputTarget.value),
)
const canBindCollection = computed(() =>
  Boolean(store.selectedAction && collectionResultPath.value.trim() && selectedCollectionTarget.value),
)
const selectedCollectionTarget = computed(() => {
  const block = editorStore.selectedBlock
  if (!block || !['header', 'section', 'div', 'footer', 'form'].includes(block.tag)) return null
  return block.id
})
const selectedOutputTarget = computed<PageActionElementBindingTarget | null>(() => {
  const block = editorStore.selectedBlock
  if (!block || !['text', 'button', 'input'].includes(block.tag)) return null
  return {
    elementId: block.id,
    property: block.tag === 'input' ? 'value' : 'text',
    label: String(block.props?.label || block.props?.name || block.props?.text || block.elementId || block.id),
  }
})
const attachTargetLabel = computed(() => {
  const block = editorStore.selectedBlock
  if (!block) return 'No element selected'
  return `${block.tag} / ${block.elementId || block.id}`
})
const attachTargetHint = computed(() => {
  if (!store.selectedAction) return 'Select a Page Action first.'
  if (!editorStore.selectedBlock) return 'Select a button or form in the canvas.'
  if (!['button', 'form'].includes(editorStore.selectedBlock.tag)) return 'Only buttons and forms can trigger actions.'
  if (isSelectedActionAttached.value) return 'This element runs the selected action.'
  return 'Click Attach to run this action from the selected element.'
})

function bindingFor(inputKey: string) {
  return bindingStore.bindingForInput(store.selectedAction?.id, inputKey)
}

function isSelectedTrigger(action: PageActionTriggerSummary) {
  return store.selectedAction?.workflowId === action.workflowId && store.selectedAction.triggerId === action.id
}

function startBindingDrag(event: PointerEvent, field: PageActionInputField) {
  if (!store.selectedAction) return
  event.preventDefault()
  event.stopPropagation()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  bindingStore.startPickWhip(store.selectedAction, field, origin)
  bindingStore.movePickWhip({ x: event.clientX, y: event.clientY }, readPageActionBindingTargetAtPoint(event.clientX, event.clientY))
  window.addEventListener('pointermove', moveBindingDrag)
  window.addEventListener('pointerup', finishBindingDrag, { once: true })
  window.addEventListener('pointercancel', cancelBindingDrag, { once: true })
}

function moveBindingDrag(event: PointerEvent) {
  bindingStore.movePickWhip({ x: event.clientX, y: event.clientY }, readPageActionBindingTargetAtPoint(event.clientX, event.clientY))
}

function finishBindingDrag(event: PointerEvent) {
  bindingStore.completePickWhip(readPageActionBindingTargetAtPoint(event.clientX, event.clientY))
  removeBindingDragListeners()
}

function cancelBindingDrag() {
  bindingStore.cancelPickWhip()
  removeBindingDragListeners()
}

function clearBinding(inputKey: string) {
  if (!store.selectedAction) return
  bindingStore.clearInputBinding(store.selectedAction.id, inputKey)
}

function inputBindingTitle(inputKey: string) {
  const binding = bindingFor(inputKey)
  if (!binding) return 'Drag to a page input'
  if (binding.source === 'scope') return `Bound to ${binding.scopePath}`
  return binding.target ? `Bound to ${binding.target.label}` : 'Bound'
}

function bindingLabel(inputKey: string) {
  const binding = bindingFor(inputKey)
  if (!binding) return ''
  if (binding.source === 'scope') return binding.scopePath ?? 'item'
  return binding.target?.label ?? ''
}

function scopeInputPath(inputKey: string) {
  const draftPath = scopedInputPaths.value[inputKey]
  if (draftPath !== undefined) return draftPath
  const binding = bindingFor(inputKey)
  return binding?.source === 'scope' ? binding.scopePath ?? '' : ''
}

function updateScopeInputPath(inputKey: string, value: string) {
  scopedInputPaths.value = { ...scopedInputPaths.value, [inputKey]: value }
}

function bindScopeInput(inputKey: string) {
  if (!store.selectedAction) return
  bindingStore.bindInputToScope(store.selectedAction, inputKey, scopeInputPath(inputKey))
}

function attachSelectedAction() {
  if (!store.selectedAction || !editorStore.selectedBlockId || !editorStore.selectedBlock) return
  if (!['button', 'form'].includes(editorStore.selectedBlock.tag)) return
  if (isSelectedActionAttached.value) return
  editorStore.patchBlock(editorStore.selectedBlockId, {
    action: {
      id: store.selectedAction.id,
      type: 'triggerWorkflow',
      workflowId: store.selectedAction.workflowId,
      triggerId: store.selectedAction.triggerId,
    },
  })
}

function bindOutputToSelectedElement() {
  if (!store.selectedAction || !selectedOutputTarget.value) return
  bindingStore.bindOutputToElement(store.selectedAction, outputResultPath.value, selectedOutputTarget.value)
}

function clearOutputBinding(bindingId: string) {
  if (!store.selectedAction) return
  bindingStore.clearOutputBinding(store.selectedAction.id, bindingId)
}

function bindCollectionToSelectedElement() {
  if (!store.selectedAction || !selectedCollectionTarget.value) return
  bindingStore.bindCollectionToElement(store.selectedAction, collectionResultPath.value, selectedCollectionTarget.value, 'repeater')
}

function bindTableToSelectedElement() {
  if (!store.selectedAction || !selectedCollectionTarget.value) return
  bindingStore.bindCollectionToElement(store.selectedAction, collectionResultPath.value, selectedCollectionTarget.value, 'table')
}

function clearCollectionBinding(bindingId: string) {
  if (!store.selectedAction) return
  bindingStore.clearCollectionBinding(store.selectedAction.id, bindingId)
}

async function runSelectedAction() {
  if (!store.selectedAction) return
  const bindings = bindingStore.bindingsForAction(store.selectedAction.id)
  const input = resolvePageActionInputBindings(store.draftInput, bindings, readPageActionBindingTargetValue)
  const result = await store.runSelectedAction(input)
  if (result?.ok) applyOutputBindings(result.data, outputBindings.value)
}

function applyOutputBindings(result: unknown, bindings: PageActionOutputBinding[]) {
  for (const binding of bindings) {
    const value = resolvePageActionResultPath(result, binding.resultPath)
    if (value !== undefined) patchOutputTarget(binding.target, value)
  }
}

function patchOutputTarget(target: PageActionElementBindingTarget, value: unknown) {
  const block = findBlock(editorStore.blocks, target.elementId)
  if (!block) return
  const nextValue = stringifyOutputValue(value)
  editorStore.patchBlock(block.id, {
    props: { ...(block.props ?? {}), [target.property === 'value' ? 'value' : 'text']: nextValue },
  })
}

function stringifyOutputValue(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value == null) return ''
  return JSON.stringify(value)
}

function findBlock(blocks: PageBlock[], blockId: string): PageBlock | null {
  for (const block of blocks) {
    if (block.id === blockId) return block
    const child = findBlock(block.children ?? [], blockId)
    if (child) return child
  }
  return null
}

function removeBindingDragListeners() {
  window.removeEventListener('pointermove', moveBindingDrag)
  window.removeEventListener('pointerup', finishBindingDrag)
  window.removeEventListener('pointercancel', cancelBindingDrag)
}

function readInputValue(event: Event, type: PageActionInputField['type']) {
  const value = (event.target as HTMLInputElement).value
  if (type === 'number') return Number(value)
  if (type === 'boolean') return value === 'true'
  return value
}

onMounted(() => {
  void store.loadAvailableActions()
})

watch(
  () => store.selectedAction?.id,
  () => {
    outputResultPath.value = store.selectedAction?.returns[0]?.key ?? 'executionId'
    collectionResultPath.value = store.selectedAction?.returns[0]?.key ?? 'items'
  },
)

onBeforeUnmount(() => {
  cancelBindingDrag()
})
</script>
