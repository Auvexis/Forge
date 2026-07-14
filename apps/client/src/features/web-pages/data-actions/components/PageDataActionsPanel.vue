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
import { computed, onBeforeUnmount, onMounted } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import PageActionPickWhipOverlay from './PageActionPickWhipOverlay.vue'
import { usePageActionsStore } from '../stores/page-actions.store'
import { usePageActionBindingsStore } from '../stores/page-action-bindings.store'
import { readPageActionBindingTargetAtPoint, readPageActionBindingTargetValue } from '../utils/bindingTargetDom'
import { resolvePageActionInputBindings, type PageActionInputField } from '@/core/page-actions'

const store = usePageActionsStore()
const bindingStore = usePageActionBindingsStore()

const actionCountLabel = computed(() => {
  const count = store.workflows.reduce((total, workflow) => total + workflow.actions.length, 0)
  return count === 1 ? '1 action' : `${count} actions`
})

const formattedResult = computed(() => JSON.stringify(store.lastRunResult, null, 2))

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

function runSelectedAction() {
  if (!store.selectedAction) return
  const bindings = bindingStore.bindingsForAction(store.selectedAction.id)
  const input = resolvePageActionInputBindings(store.draftInput, bindings, readPageActionBindingTargetValue)
  void store.runSelectedAction(input)
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
