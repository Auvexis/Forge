import type { WorkflowItem, WorkflowNode } from '@/core/types/workflow.types'
import { useApi } from '@/shared/composables/useApi'
import { workflowsApi } from '@/core/api/workflows.api'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from '@/shared/composables/useToast'

/** Serializa o workflow para comparação, ignorando campos voláteis como updatedAt */
function serializeForDiff(workflow: WorkflowItem): string {
  const { metadata: { updatedAt, version, ...restMeta }, ...rest } = workflow
  return JSON.stringify({ ...rest, metadata: restMeta })
}

export const useWorkflowStore = defineStore('workflow', () => {
  const toast = useToast()
  const activeWorkflow = ref<WorkflowItem | null>(null)
  const _savedSnapshot = ref<string | null>(null)
  const graphUpdateTrigger = ref(0)

  const isDirty = computed(() => {
    if (!activeWorkflow.value || _savedSnapshot.value === null) return false
    return serializeForDiff(activeWorkflow.value) !== _savedSnapshot.value
  })

  function setActiveWorkflow(workflow: WorkflowItem) {
    activeWorkflow.value = workflow
    _savedSnapshot.value = serializeForDiff(workflow)
  }

  function clearWorkflow() {
    activeWorkflow.value = null
    _savedSnapshot.value = null
  }

  /** Force the workflow to be considered dirty */
  function markDirty() {
    _savedSnapshot.value = ''
  }

  /**
   * Atualiza campos específicos do dado de um node pelo ID.
   * O payload é mesclado (shallow merge) — só os campos enviados são alterados.
   */
  function updateNodeData(nodeId: string, payload: Record<string, unknown>) {
    if (!activeWorkflow.value) return

    if (nodeId === 'trigger') {
      Object.assign(activeWorkflow.value.trigger, payload)
    } else if (activeWorkflow.value.nodes[nodeId]) {
      Object.assign(activeWorkflow.value.nodes[nodeId], payload)
    }
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

    isDirty // note: no longer settable here, just trigger graph update
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
      _savedSnapshot.value = serializeForDiff(savedWorkflow)
      toast.success('Workflow saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save workflow')
    }
  }

  const deleteApi = useApi(workflowsApi.delete)
  function deleteActiveWorkflow() {
    if (!activeWorkflow.value) return

    try {
      deleteApi.execute(activeWorkflow.value.metadata.id)
      clearWorkflow()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workflow')
    }
  }

  function deleteWorkflow(id: string) {
    try {
      deleteApi.execute(id)
      clearWorkflow()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workflow')
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
