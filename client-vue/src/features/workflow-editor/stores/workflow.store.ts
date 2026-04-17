import type { WorkflowItem } from '@/core/types/workflow.types'
import router from '@/router'
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

  return {
    activeWorkflow,
    isDirty,
    setActiveWorkflow,
    clearWorkflow,
  }
})
