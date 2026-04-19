import { useRouter } from 'vue-router'
import { useWorkflowStore } from '../stores/workflow.store'
import type { WorkflowItem } from '@/core/types/workflow.types'

export function useWorkflowActions() {
  const router = useRouter()
  const workflowStore = useWorkflowStore()

  function openWorkflow(workflow: WorkflowItem) {
    workflowStore.setActiveWorkflow(workflow)
    router.push(`/workflows/${workflow.metadata.id}`)
  }

  function closeWorkflow() {
    workflowStore.clearWorkflow()
    router.push('/workflows')
  }

  function saveWorkflow() {
    workflowStore.saveActiveWorkflow()
  }

  function exportWorkflow() {
    const workflow = workflowStore.activeWorkflow
    const id = workflow?.metadata.id

    const fileName = `workflow_${id}_v${workflow?.metadata.version}.json`

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  function deleteWorkflow(id: string) {
    workflowStore.deleteWorkflow(id)
  }

  function deleteActiveWorkflow() {
    workflowStore.deleteActiveWorkflow()
    router.push('/workflows')
  }

  return {
    openWorkflow,
    closeWorkflow,
    saveWorkflow,
    exportWorkflow,
    deleteWorkflow,
    deleteActiveWorkflow,
  }
}
