import type { WorkflowItem, WorkflowNode } from '@/core/types/workflow.types'
import { useApi } from '@/shared/composables/useApi'
import { workflowsApi } from '@/core/api/workflows.api'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWorkflowStore = defineStore('workflow', () => {
  const activeWorkflow = ref<WorkflowItem | null>(null)
  const isDirty = ref(false)
  const graphUpdateTrigger = ref(0)

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

  /**
   * Renomeia o ID de um node. Atualiza edges apontando para ele e forca o canvas a remontar.
   */
  function renameNode(oldId: string, newId: string) {
    if (!activeWorkflow.value) return false
    if (oldId === 'trigger' || newId === 'trigger') return false
    if (activeWorkflow.value.nodes[newId]) return false // Conflict

    const nodeData = activeWorkflow.value.nodes[oldId]
    if (!nodeData) return false

    activeWorkflow.value.nodes[newId] = nodeData
    delete activeWorkflow.value.nodes[oldId]

    // Update edges
    activeWorkflow.value.edges.forEach((edge) => {
      if (edge.source === oldId) edge.source = newId
      if (edge.target === oldId) edge.target = newId
    })

    isDirty.value = true
    graphUpdateTrigger.value++
    return true
  }

  /**
   * Bumps the patch segment of a "MAJOR.MINOR.PATCH" version string.
   * Rolls over: ...9 → next minor; minor 9 → next major.
   * Falls back gracefully if the version is not in semver format.
   */
  function bumpVersion(version: string): string {
    const parts = String(version).split('.').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) {
      // Not a valid semver — start fresh
      return '1.0.0'
    }
    let [major, minor, patch] = parts
    patch! += 1
    if (patch! >= 10) {
      patch = 0
      minor! += 1
    }
    if (minor! >= 10) {
      minor = 0
      major! += 1
    }
    return `${major}.${minor}.${patch}`
  }

  const saveApi = useApi(workflowsApi.update)
  async function saveActiveWorkflow() {
    if (!activeWorkflow.value) return

    try {
      const workflow = activeWorkflow.value
      const updatedVersion = bumpVersion(workflow.metadata.version)
      const updatedDate = new Date().toISOString()

      const updatedWorkflow = {
        ...workflow,
        metadata: {
          ...workflow.metadata,
          version: updatedVersion,
          updatedAt: updatedDate,
        },
      }

      const savedWorkflow = await saveApi.execute(activeWorkflow.value.metadata.id, updatedWorkflow)

      activeWorkflow.value = savedWorkflow
      isDirty.value = false
    } catch (error) {
      console.error('Failed to save workflow:', error)
    }
  }

  const deleteApi = useApi(workflowsApi.delete)
  function deleteActiveWorkflow() {
    if (!activeWorkflow.value) return

    try {
      deleteApi.execute(activeWorkflow.value.metadata.id)
      clearWorkflow()
    } catch (error) {
      console.error('Failed to delete workflow:', error)
    }
  }

  function deleteWorkflow(id: string) {
    try {
      deleteApi.execute(id)
      clearWorkflow()
    } catch (error) {
      console.error('Failed to delete workflow:', error)
    }
  }

  return {
    activeWorkflow,
    isDirty,
    graphUpdateTrigger,
    isSaving: saveApi.loading,
    setActiveWorkflow,
    clearWorkflow,
    markDirty,
    updateNodeData,
    renameNode,
    saveActiveWorkflow,
    deleteActiveWorkflow,
    deleteWorkflow,
  }
})
