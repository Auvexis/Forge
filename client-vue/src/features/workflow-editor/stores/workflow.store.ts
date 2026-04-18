import type { WorkflowItem, WorkflowNode } from '@/core/types/workflow.types'
import { useApi } from '@/shared/composables/useApi'
import { workflowsApi } from '@/core/api/workflows.api'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWorkflowStore = defineStore('workflow', () => {
  const activeWorkflow = ref<WorkflowItem | null>(null)
  const isDirty = ref(false)

  function setActiveWorkflow(workflow: WorkflowItem) {
    activeWorkflow.value = workflow
    isDirty.value = false
  }

  function clearWorkflow() {
    activeWorkflow.value = null
    isDirty.value = false
  }

  /** Chamado pelo VueFlow quando nodes são movidos, adicionados ou removidos */
  function markDirty() {
    isDirty.value = true
  }

  /**
   * Atualiza campos específicos do dado de um node pelo ID.
   * O payload é mesclado (shallow merge) — só os campos enviados são alterados.
   */
  function updateNodeData(nodeId: string, payload: Record<string, unknown>) {
    if (!activeWorkflow.value) return

    if (nodeId === 'trigger') {
      activeWorkflow.value.trigger = {
        ...activeWorkflow.value.trigger,
        ...payload,
      } as typeof activeWorkflow.value.trigger
    } else if (activeWorkflow.value.nodes[nodeId]) {
      activeWorkflow.value.nodes[nodeId] = {
        ...activeWorkflow.value.nodes[nodeId],
        ...payload,
      } as WorkflowNode
    }

    isDirty.value = true
  }

  const saveApi = useApi(workflowsApi.update)
  async function saveActiveWorkflow() {
    if (!activeWorkflow.value) return

    try {
      const savedWorkflow = await saveApi.execute(
        activeWorkflow.value.metadata.id,
        activeWorkflow.value,
      )

      activeWorkflow.value = savedWorkflow
      isDirty.value = false
    } catch (error) {
      console.error('Failed to save workflow:', error)
    }
  }

  return {
    activeWorkflow,
    isDirty,
    isSaving: saveApi.loading,
    setActiveWorkflow,
    clearWorkflow,
    markDirty,
    updateNodeData,
    saveActiveWorkflow,
  }
})
