import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createElementInputBinding,
  type PageActionDefinition,
  type PageActionElementBindingTarget,
  type PageActionInputBinding,
  type PageActionInputField,
} from '@/core/page-actions'
import type { PageActionDocument } from '../../types/page.types.ts'

export interface PageActionPickWhipState {
  action: PageActionDefinition
  field: PageActionInputField
  origin: { x: number; y: number }
  pointer: { x: number; y: number }
}

export const usePageActionBindingsStore = defineStore('web-page-action-bindings', () => {
  const bindingsByAction = ref<Record<string, Record<string, PageActionInputBinding>>>({})
  const pickWhip = ref<PageActionPickWhipState | null>(null)
  const hoveredTarget = ref<PageActionElementBindingTarget | null>(null)

  const isPicking = computed(() => Boolean(pickWhip.value))

  function bindingsForAction(actionId: string | null | undefined) {
    if (!actionId) return {}
    return bindingsByAction.value[actionId] ?? {}
  }

  function replaceBindings(bindings: PageActionDocument['inputBindings'] = {}) {
    bindingsByAction.value = cloneBindings(bindings)
  }

  function exportBindings() {
    return cloneBindings(bindingsByAction.value)
  }

  function bindingForInput(actionId: string | null | undefined, inputKey: string) {
    return bindingsForAction(actionId)[inputKey] ?? null
  }

  function startPickWhip(action: PageActionDefinition, field: PageActionInputField, origin: { x: number; y: number }) {
    pickWhip.value = {
      action,
      field,
      origin,
      pointer: origin,
    }
    hoveredTarget.value = null
  }

  function movePickWhip(pointer: { x: number; y: number }, target: PageActionElementBindingTarget | null = null) {
    if (!pickWhip.value) return
    pickWhip.value = {
      ...pickWhip.value,
      pointer,
    }
    hoveredTarget.value = target
  }

  function completePickWhip(target: PageActionElementBindingTarget | null) {
    if (!pickWhip.value || !target) {
      cancelPickWhip()
      return null
    }
    const binding = createElementInputBinding(pickWhip.value.action, pickWhip.value.field.key, target)
    bindingsByAction.value = {
      ...bindingsByAction.value,
      [pickWhip.value.action.id]: {
        ...bindingsForAction(pickWhip.value.action.id),
        [pickWhip.value.field.key]: binding,
      },
    }
    cancelPickWhip()
    return binding
  }

  function clearInputBinding(actionId: string, inputKey: string) {
    const actionBindings = { ...bindingsForAction(actionId) }
    delete actionBindings[inputKey]
    bindingsByAction.value = {
      ...bindingsByAction.value,
      [actionId]: actionBindings,
    }
  }

  function clearActionBindings(actionId: string) {
    const nextBindings = { ...bindingsByAction.value }
    delete nextBindings[actionId]
    bindingsByAction.value = nextBindings
  }

  function cancelPickWhip() {
    pickWhip.value = null
    hoveredTarget.value = null
  }

  return {
    bindingsByAction,
    pickWhip,
    hoveredTarget,
    isPicking,
    bindingsForAction,
    bindingForInput,
    replaceBindings,
    exportBindings,
    startPickWhip,
    movePickWhip,
    completePickWhip,
    clearInputBinding,
    clearActionBindings,
    cancelPickWhip,
  }
})

function cloneBindings(bindings: Record<string, Record<string, PageActionInputBinding>>) {
  return JSON.parse(JSON.stringify(bindings)) as Record<string, Record<string, PageActionInputBinding>>
}
