import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Node } from '@vue-flow/core'

export const useNodeInspectorStore = defineStore('node-inspector', () => {
  const isOpen = ref(false)
  const activeNodeId = ref<string | null>(null)
  const activeNode = ref<Node | null>(null)
  
  const isTesting = ref(false)
  const lastTestOutput = ref<any>(null)
  const draggedVariablePath = ref<string | null>(null)

  function openInspector(node: Node) {
    activeNodeId.value = node.id
    activeNode.value = node
    // Reset test output when opening a new node, unless it's the same node
    if (activeNodeId.value !== node.id) {
      lastTestOutput.value = null
    }
    isOpen.value = true
  }

  function closeInspector() {
    isOpen.value = false
    // We don't nullify activeNode immediately to allow exit animations if needed
    // activeNodeId.value = null
    // activeNode.value = null
  }

  return {
    isOpen,
    activeNodeId,
    activeNode,
    isTesting,
    lastTestOutput,
    draggedVariablePath,
    openInspector,
    closeInspector
  }
})
