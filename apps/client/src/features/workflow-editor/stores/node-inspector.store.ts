import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WorkflowGraphNode as Node } from '../workflow-canvas/workflowGraphTypes'
import { workflowsApi } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'

export const useNodeInspectorStore = defineStore('node-inspector', () => {
  const isOpen = ref(false)
  const activeNodeId = ref<string | null>(null)
  const activeNode = ref<Node | null>(null)
  const openTabs = ref<Node[]>([])

  const isTesting = ref(false)
  const lastTestOutput = ref<any>(null)
  const draggedVariablePath = ref<string | null>(null)

  function openInspector(node: Node) {
    // Reset test output when opening a new node
    if (activeNodeId.value !== node.id) {
      lastTestOutput.value = null
    }
    const existingIndex = openTabs.value.findIndex((tab) => tab.id === node.id)
    if (existingIndex >= 0) openTabs.value[existingIndex] = node
    else openTabs.value.push(node)
    activateInspector(node)
    isOpen.value = true
  }

  function selectInspector(nodeId: string) {
    const node = openTabs.value.find((tab) => tab.id === nodeId)
    if (!node) return
    if (activeNodeId.value !== nodeId) lastTestOutput.value = null
    activateInspector(node)
  }

  function closeInspectorTab(nodeId: string) {
    const closingIndex = openTabs.value.findIndex((tab) => tab.id === nodeId)
    if (closingIndex < 0) return
    openTabs.value.splice(closingIndex, 1)

    if (activeNodeId.value === nodeId) {
      const next = openTabs.value[Math.min(closingIndex, openTabs.value.length - 1)] ?? null
      if (next) activateInspector(next)
      else closeInspector()
    }
  }

  function renameInspectorTab(previousId: string, nextId: string) {
    const tab = openTabs.value.find((item) => item.id === previousId)
    if (tab) tab.id = nextId
    if (activeNodeId.value === previousId) activeNodeId.value = nextId
  }

  function activateInspector(node: Node) {
    activeNodeId.value = node.id
    activeNode.value = node
  }

  function closeInspector() {
    isOpen.value = false
    openTabs.value = []
    activeNodeId.value = null
    activeNode.value = null
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
    openTabs,
    isTesting,
    lastTestOutput,
    draggedVariablePath,
    openInspector,
    selectInspector,
    closeInspectorTab,
    renameInspectorTab,
    closeInspector,
    testNode
  }
})
