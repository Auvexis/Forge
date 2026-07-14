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
            icon-left="mouse-pointer-click"
            :disabled="!canAttachSelectedAction"
            @click="attachSelectedAction"
          >
            Attach
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
                :title="bindingFor(field.key) ? `Bound to ${bindingFor(field.key)?.target.label}` : 'Drag to a page input'"
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
            <div v-if="bindingFor(field.key)" class="web-page-data-actions__binding-chip">
              <LucideIcon name="link-2" :size="12" />
              <span>
                {{ bindingFor(field.key)?.target.label }}
                <small>{{ bindingFor(field.key)?.target.property }}</small>
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
            />
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
} from '@/core/page-actions'

const store = usePageActionsStore()
const bindingStore = usePageActionBindingsStore()
const editorStore = usePageEditorStore()
const outputResultPath = ref('executionId')

const actionCountLabel = computed(() => {
  const count = store.workflows.reduce((total, workflow) => total + workflow.actions.length, 0)
  return count === 1 ? '1 action' : `${count} actions`
})

const formattedResult = computed(() => JSON.stringify(store.lastRunResult, null, 2))
const outputBindings = computed(() => bindingStore.outputBindingsForAction(store.selectedAction?.id))
const canAttachSelectedAction = computed(() =>
  Boolean(store.selectedAction && editorStore.selectedBlock && ['button', 'form'].includes(editorStore.selectedBlock.tag)),
)
const canBindOutput = computed(() =>
  Boolean(store.selectedAction && outputResultPath.value.trim() && selectedOutputTarget.value),
)
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

function attachSelectedAction() {
  if (!store.selectedAction || !editorStore.selectedBlockId || !editorStore.selectedBlock) return
  if (!['button', 'form'].includes(editorStore.selectedBlock.tag)) return
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
  if (store.workflows.length === 0) void store.loadAvailableActions()
})

onBeforeUnmount(() => {
  cancelBindingDrag()
})
</script>
