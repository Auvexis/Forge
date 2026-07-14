import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  buildDefaultActionInput,
  createPageActionDefinition,
  type PageActionDefinition,
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
  const isLoading = ref(false)

  const hasActions = computed(() => workflows.value.some((workflow) => workflow.actions.length > 0))

  async function loadAvailableActions() {
    isLoading.value = true
    error.value = null
    try {
      workflows.value = await workflowPageActionGateway.listAvailableActions()
      if (!selectedAction.value) {
        const firstAction = workflows.value.flatMap((workflow) => workflow.actions)[0]
        if (firstAction) selectTrigger(firstAction)
      }
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
    status.value = result.ok ? 'success' : 'error'
    if (!result.ok) error.value = result.error ?? 'Page action failed.'
    return result
  }

  return {
    workflows,
    selectedAction,
    draftInput,
    lastRunResult,
    status,
    error,
    isLoading,
    hasActions,
    loadAvailableActions,
    selectTrigger,
    updateInput,
    runSelectedAction,
  }
})
