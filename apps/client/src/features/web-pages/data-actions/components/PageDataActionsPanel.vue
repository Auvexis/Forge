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
      <section class="web-page-data-actions__list" aria-label="Available workflow actions">
        <article
          v-for="workflow in store.workflows"
          :key="workflow.id"
          class="web-page-data-actions__workflow"
        >
          <h4>{{ workflow.name }}</h4>
          <button
            v-for="action in workflow.actions"
            :key="action.id"
            type="button"
            class="web-page-data-actions__action"
            :class="{ 'web-page-data-actions__action--active': action.id === store.selectedAction?.triggerId }"
            @click="store.selectTrigger(action)"
          >
            <LucideIcon :name="action.icon || 'workflow'" :size="14" />
            <span>{{ action.name }}</span>
            <small>{{ action.type }}</small>
          </button>
        </article>
      </section>

      <section v-if="store.selectedAction" class="web-page-data-actions__details">
        <header>
          <strong>{{ store.selectedAction.name }}</strong>
          <span>{{ store.selectedAction.workflowName }}</span>
        </header>

        <div class="web-page-data-actions__attach">
          <div>
            <strong>{{ attachTargetLabel }}</strong>
            <span>{{ attachTargetHint }}</span>
          </div>
          <BaseButton
            variant="ghost"
            size="sm"
            :icon-left="isSelectedActionAttached ? 'check' : 'mouse-pointer-click'"
            :disabled="!canAttachSelectedAction"
            @click="attachSelectedAction"
          >
            {{ isSelectedActionAttached ? 'Attached' : 'Attach' }}
          </BaseButton>
        </div>

        <div class="web-page-data-actions__fields">
          <h5>Inputs</h5>
          <div v-if="store.selectedAction.inputs.length === 0" class="web-page-data-actions__hint">
            This trigger has no declared inputs.
          </div>
          <div
            v-for="field in store.selectedAction.inputs"
            :key="field.key"
            class="web-page-data-actions__field"
          >
            <span>
              {{ field.label }}
              <small v-if="field.required">required</small>
            </span>
            <div class="web-page-data-actions__input-row">
              <button
                type="button"
                class="web-page-data-actions__bind-handle"
                :class="{ 'web-page-data-actions__bind-handle--active': Boolean(bindingFor(field.key)) }"
                :title="inputBindingTitle(field.key)"
                @pointerdown="startBindingDrag($event, field)"
              >
                <LucideIcon name="circle-dot-dashed" :size="14" />
              </button>
              <input
                :value="String(store.draftInput[field.key] ?? '')"
                :type="field.type === 'number' ? 'number' : 'text'"
                @input="store.updateInput(field.key, readInputValue($event, field.type))"
              />
            </div>
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
            <div v-if="bindingFor(field.key)" class="web-page-data-actions__binding-chip">
              <LucideIcon :name="bindingFor(field.key)?.source === 'scope' ? 'braces' : 'link-2'" :size="12" />
              <span>
                {{ bindingLabel(field.key) }}
                <small>{{ bindingFor(field.key)?.source }}</small>
              </span>
              <button
                type="button"
                title="Remove binding"
                @click="clearBinding(field.key)"
              >
                <LucideIcon name="x" :size="12" />
              </button>
            </div>
          </div>
        </div>

        <div class="web-page-data-actions__fields web-page-data-actions__fields--outputs">
          <h5>Outputs</h5>
          <div class="web-page-data-actions__output-row">
            <input
              v-model="outputResultPath"
              placeholder="executionId"
              list="page-action-return-fields"
            />
            <datalist id="page-action-return-fields">
              <option
                v-for="field in store.selectedAction.returns"
                :key="field.key"
                :value="field.key"
              />
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
            Bind a result path to a selected text, button, or input element.
          </div>
          <div
            v-for="binding in outputBindings"
            :key="binding.id"
            class="web-page-data-actions__binding-chip"
          >
            <LucideIcon name="arrow-right-left" :size="12" />
            <span>
              {{ binding.resultPath }} -> {{ binding.target.label }}
              <small>{{ binding.target.property }}</small>
            </span>
            <button
              type="button"
              title="Remove output binding"
              @click="clearOutputBinding(binding.id)"
            >
              <LucideIcon name="x" :size="12" />
            </button>
          </div>
        </div>

        <div class="web-page-data-actions__fields web-page-data-actions__fields--collections">
          <h5>Collections</h5>
          <div class="web-page-data-actions__output-row">
            <input
              v-model="collectionResultPath"
              placeholder="fruits"
              list="page-action-return-fields"
            />
            <BaseButton
              variant="ghost"
              size="sm"
              icon-left="repeat"
              :disabled="!canBindCollection"
              @click="bindCollectionToSelectedElement"
            >
              Bind
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
            Bind an array result to a selected container. Children can use item.name paths.
          </div>
          <div
            v-for="binding in collectionBindings"
            :key="binding.id"
            class="web-page-data-actions__binding-chip"
          >
            <LucideIcon name="repeat" :size="12" />
            <span>
              {{ binding.collectionPath }} -> {{ binding.targetElementId }}
              <small>{{ binding.mode ?? 'repeater' }}</small>
            </span>
            <button
              type="button"
              title="Remove collection binding"
              @click="clearCollectionBinding(binding.id)"
            >
              <LucideIcon name="x" :size="12" />
            </button>
          </div>
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
  type PageActionCollectionBinding,
  type PageActionElementBindingTarget,
  type PageActionInputField,
  type PageActionOutputBinding,
} from '@/core/page-actions'

const store = usePageActionsStore()
const bindingStore = usePageActionBindingsStore()
const editorStore = usePageEditorStore()
const outputResultPath = ref('executionId')
const collectionResultPath = ref('fruits')

const actionCountLabel = computed(() => {
  const count = store.workflows.reduce((total, workflow) => total + workflow.actions.length, 0)
  return count === 1 ? '1 action' : `${count} actions`
})

const formattedResult = computed(() => JSON.stringify(store.lastRunResult, null, 2))
const outputBindings = computed(() => bindingStore.outputBindingsForAction(store.selectedAction?.id))
const collectionBindings = computed(() => bindingStore.collectionBindingsForAction(store.selectedAction?.id))
const scopedInputPaths = ref<Record<string, string>>({})
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

function startBindingDrag(event: PointerEvent, field: PageActionInputField) {
  if (!store.selectedAction) return
  event.preventDefault()
  event.stopPropagation()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const origin = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
  bindingStore.startPickWhip(store.selectedAction, field, origin)
  bindingStore.movePickWhip({ x: event.clientX, y: event.clientY }, readPageActionBindingTargetAtPoint(event.clientX, event.clientY))
  window.addEventListener('pointermove', moveBindingDrag)
  window.addEventListener('pointerup', finishBindingDrag, { once: true })
  window.addEventListener('pointercancel', cancelBindingDrag, { once: true })
}

function moveBindingDrag(event: PointerEvent) {
  bindingStore.movePickWhip(
    { x: event.clientX, y: event.clientY },
    readPageActionBindingTargetAtPoint(event.clientX, event.clientY),
  )
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
  scopedInputPaths.value = {
    ...scopedInputPaths.value,
    [inputKey]: value,
  }
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
  if (result?.ok) {
    applyCollectionBindings(result.data, collectionBindings.value, outputBindings.value)
    applyOutputBindings(result.data, outputBindings.value)
  }
}

function applyOutputBindings(result: unknown, bindings: PageActionOutputBinding[]) {
  for (const binding of bindings) {
    const value = resolvePageActionResultPath(result, binding.resultPath)
    if (value === undefined) continue
    patchOutputTarget(binding.target, value)
  }
}

function patchOutputTarget(target: PageActionElementBindingTarget, value: unknown) {
  const block = findBlock(editorStore.blocks, target.elementId)
  if (!block) return
  const nextValue = stringifyOutputValue(value)
  if (target.property === 'value') {
    editorStore.patchBlock(block.id, {
      props: { ...(block.props ?? {}), value: nextValue },
    })
    return
  }
  editorStore.patchBlock(block.id, {
    props: { ...(block.props ?? {}), text: nextValue },
  })
}

function applyCollectionBindings(
  result: unknown,
  bindings: PageActionCollectionBinding[],
  scopedOutputBindings: PageActionOutputBinding[],
) {
  for (const binding of bindings) {
    const collection = resolvePageActionResultPath(result, binding.collectionPath)
    const host = readPreviewHost(binding.targetElementId)
    if (!host || !Array.isArray(collection)) continue
    if (binding.mode === 'table') {
      renderPreviewTable(host, collection)
      continue
    }
    renderPreviewRepeater(host, collection, scopedOutputBindings, result)
  }
}

function readPreviewHost(elementId: string) {
  const frame = document.querySelector<HTMLElement>(
    `[data-page-action-binding-element-id="${escapeCss(elementId)}"] .web-page-block-frame__inner`,
  )
  if (frame) return frame
  return document.querySelector<HTMLElement>(
    `[data-page-action-binding-element-id="${escapeCss(elementId)}"]`,
  )
}

function renderPreviewRepeater(
  host: HTMLElement,
  collection: unknown[],
  scopedOutputBindings: PageActionOutputBinding[],
  result: unknown,
) {
  const templates = readOrStorePreviewTemplates(host)
  host.replaceChildren()
  collection.forEach((item, index) => {
    const fragment = document.createDocumentFragment()
    templates.forEach((template) => fragment.appendChild(template.cloneNode(true)))
    const wrapper = document.createElement('span')
    wrapper.dataset.fabricTestPreview = 'repeater-item'
    wrapper.dataset.fabricRepeaterIndex = String(index)
    wrapper.appendChild(fragment)
    for (const binding of scopedOutputBindings) {
      const value = resolveScopedResultPath(result, item, binding.resultPath)
      if (value !== undefined) writePreviewOutput(wrapper, binding.target, value)
    }
    while (wrapper.firstChild) host.appendChild(wrapper.firstChild)
  })
}

function readOrStorePreviewTemplates(host: HTMLElement) {
  const existing = host.dataset.fabricPreviewTemplate
  if (existing) {
    const template = document.createElement('template')
    template.innerHTML = existing
    return Array.from(template.content.childNodes)
  }
  host.dataset.fabricPreviewTemplate = host.innerHTML
  return Array.from(host.childNodes).map((node) => node.cloneNode(true))
}

function renderPreviewTable(host: HTMLElement, collection: unknown[]) {
  if (!host.dataset.fabricPreviewTemplate) host.dataset.fabricPreviewTemplate = host.innerHTML
  const columns = tableColumns(collection)
  const table = document.createElement('table')
  table.className = 'web-page-test-run-table'
  table.dataset.fabricTestPreview = 'table'
  const thead = document.createElement('thead')
  const headerRow = document.createElement('tr')
  columns.forEach((column) => {
    const th = document.createElement('th')
    th.textContent = humanizeColumn(column)
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  const tbody = document.createElement('tbody')
  collection.forEach((item, index) => {
    const row = document.createElement('tr')
    row.dataset.fabricRepeaterIndex = String(index)
    columns.forEach((column) => {
      const td = document.createElement('td')
      td.textContent = stringifyOutputValue(column === 'value' ? item : resolvePageActionResultPath(item, column))
      row.appendChild(td)
    })
    tbody.appendChild(row)
  })
  table.append(thead, tbody)
  host.replaceChildren(table)
}

function tableColumns(collection: unknown[]) {
  const columns: string[] = []
  for (const item of collection.slice(0, 25)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    for (const key of Object.keys(item)) {
      if (!columns.includes(key) && columns.length < 8) columns.push(key)
    }
  }
  return columns.length ? columns : ['value']
}

function writePreviewOutput(root: ParentNode, target: PageActionElementBindingTarget, value: unknown) {
  const frame = root.querySelector<HTMLElement>(
    `[data-page-action-binding-element-id="${escapeCss(target.elementId)}"]`,
  )
  const element = frame?.querySelector<HTMLElement>('.web-page-block-frame__inner') ?? frame
  if (!element) return
  const nextValue = stringifyOutputValue(value)
  if (target.property === 'value' && isValueElement(element)) {
    element.value = nextValue
    return
  }
  if (target.property === 'checked' && element instanceof HTMLInputElement) {
    element.checked = Boolean(value)
    return
  }
  element.textContent = nextValue
}

function resolveScopedResultPath(result: unknown, item: unknown, path: string) {
  if (path === 'item') return item
  if (path.startsWith('item.')) return resolvePageActionResultPath(item, path.slice(5))
  return resolvePageActionResultPath(result, path)
}

function humanizeColumn(key: string) {
  return key
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase())
}

function stringifyOutputValue(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value == null) return ''
  return JSON.stringify(value)
}

function isValueElement(element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
}

function escapeCss(value: string) {
  if (typeof CSS !== 'undefined' && 'escape' in CSS) return CSS.escape(value)
  return value.replace(/["\\]/g, '\\$&')
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
  if (store.workflows.length === 0) void store.loadAvailableActions()
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
