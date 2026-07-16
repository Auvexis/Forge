import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  buildDefaultActionInput,
  createPageActionDefinition,
  resolvePageActionResultPath,
  type PageActionDefinition,
  type PageActionInputPrimitive,
  type PageActionRunResult,
  type PageActionRunStatus,
  type PageActionTriggerSummary,
  type PageActionWorkflowSummary,
  workflowPageActionGateway,
} from '@/core/page-actions'

export const usePageActionsStore = defineStore('web-page-actions', () => {
  const workflows = ref<PageActionWorkflowSummary[]>([])
  const selectedAction = ref<PageActionDefinition | null>(null)
  const draftInput = ref<Record<string, unknown>>({})
  const lastRunResult = ref<PageActionRunResult | null>(null)
  const status = ref<PageActionRunStatus>('idle')
  const error = ref<string | null>(null)
  const inferredReturnTypes = ref<Record<string, PageActionInputPrimitive>>({})
  const isLoading = ref(false)

  const hasActions = computed(() => workflows.value.some((workflow) => workflow.actions.length > 0))

  async function loadAvailableActions() {
    isLoading.value = true
    error.value = null
    try {
      workflows.value = await workflowPageActionGateway.listAvailableActions()
      if (selectedAction.value && !hasLoadedAction(selectedAction.value)) clearSelection()
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Failed to load page actions.'
    } finally {
      isLoading.value = false
    }
  }

  function selectTrigger(trigger: PageActionTriggerSummary) {
    selectedAction.value = createPageActionDefinition(trigger)
    draftInput.value = buildDefaultActionInput(selectedAction.value.inputs)
    lastRunResult.value = null
    status.value = 'idle'
    error.value = null
  }

  function clearSelection() {
    selectedAction.value = null
    draftInput.value = {}
    lastRunResult.value = null
    status.value = 'idle'
    error.value = null
  }

  function hasLoadedAction(action: PageActionDefinition) {
    return workflows.value.some((workflow) =>
      workflow.id === action.workflowId && workflow.actions.some((trigger) => trigger.id === action.triggerId),
    )
  }

  function updateInput(key: string, value: unknown) {
    draftInput.value = { ...draftInput.value, [key]: value }
  }

  async function runSelectedAction(input: Record<string, unknown> = draftInput.value) {
    if (!selectedAction.value) return null
    status.value = 'running'
    error.value = null
    lastRunResult.value = null
    const result = await workflowPageActionGateway.runAction({
      action: selectedAction.value,
      input,
    })
    lastRunResult.value = result
    if (result.ok && result.data !== undefined) inferActionReturnTypes(selectedAction.value, result.data)
    status.value = result.ok ? 'success' : 'error'
    if (!result.ok) error.value = result.error ?? 'Page action failed.'
    return result
  }

  function resolvedReturnType(actionId: string, returnKey: string, declaredType: PageActionInputPrimitive | 'unknown') {
    return inferredReturnTypes.value[`${actionId}:${returnKey}`] ?? declaredType
  }

  function inferActionReturnTypes(action: PageActionDefinition, data: unknown) {
    const inferred = { ...inferredReturnTypes.value }
    for (const field of action.returns) {
      const value = resolvePageActionResultPath(data, field.key)
      if (value === undefined) continue
      inferred[`${action.id}:${field.key}`] = inferValueType(value)
    }
    inferredReturnTypes.value = inferred
  }

  return {
    workflows,
    selectedAction,
    draftInput,
    lastRunResult,
    status,
    error,
    inferredReturnTypes,
    isLoading,
    hasActions,
    loadAvailableActions,
    selectTrigger,
    clearSelection,
    updateInput,
    resolvedReturnType,
    runSelectedAction,
  }
})

function inferValueType(value: unknown): PageActionInputPrimitive {
  if (Array.isArray(value)) return 'array'
  if (typeof File !== 'undefined' && value instanceof File) return 'file'
  if (value !== null && typeof value === 'object') return 'object'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'string'
}
