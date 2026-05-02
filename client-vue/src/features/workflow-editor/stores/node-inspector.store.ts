import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Node } from '@vue-flow/core'
import { workflowsApi } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'

export const useNodeInspectorStore = defineStore('node-inspector', () => {
  const isOpen = ref(false)
  const activeNodeId = ref<string | null>(null)
  const activeNode = ref<Node | null>(null)
  
  const isTesting = ref(false)
  const lastTestOutput = ref<any>(null)
  const draggedVariablePath = ref<string | null>(null)

  function openInspector(node: Node) {
    // Reset test output when opening a new node
    if (activeNodeId.value !== node.id) {
      lastTestOutput.value = null
    }
    activeNodeId.value = node.id
    activeNode.value = node
    isOpen.value = true
  }

  function closeInspector() {
    isOpen.value = false
    // We don't nullify activeNode immediately to allow exit animations if needed
    // activeNodeId.value = null
    // activeNode.value = null
  }

  async function testNode(workflowId: string, nodeId: string, nodeConfig: unknown) {
    const { error } = useToast()
    isTesting.value = true
    lastTestOutput.value = null
    
    try {
      const response = await workflowsApi.executeNode(workflowId, nodeId, nodeConfig)
      lastTestOutput.value = {
        success: true,
        data: response.data || response // the route returns data inside the response wrapper
      }
    } catch (err: any) {
      lastTestOutput.value = {
        success: false,
        error: err?.message || 'Execution failed'
      }
      error('Node execution failed')
    } finally {
      isTesting.value = false
    }
  }

  return {
    isOpen,
    activeNodeId,
    activeNode,
    isTesting,
    lastTestOutput,
    draggedVariablePath,
    openInspector,
    closeInspector,
    testNode
  }
})
