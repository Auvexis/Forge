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

  return { openWorkflow, closeWorkflow }
}
