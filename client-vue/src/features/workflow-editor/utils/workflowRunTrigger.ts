import type { TriggerNode, WorkflowItem, WorkflowNode, WorkflowTrigger } from '@/core/types/workflow.types'

export interface ToolbarRunTrigger {
  triggerNodeId: string
  trigger: WorkflowTrigger
  runMode: 'workflow-run' | 'chat-panel'
}

function isTriggerNode(node: WorkflowNode): node is TriggerNode {
  return node.type === 'trigger'
}

export function selectToolbarRunTrigger(workflow: WorkflowItem): ToolbarRunTrigger | null {
  const realTriggerEntries = Object.entries(workflow.nodes)
    .filter((entry): entry is [string, TriggerNode] => isTriggerNode(entry[1]))

  if (realTriggerEntries.length === 0) {
    return {
      triggerNodeId: 'trigger',
      trigger: workflow.trigger,
      runMode: workflow.trigger.type === 'chat' ? 'chat-panel' : 'workflow-run',
    }
  }

  const manualTriggerEntry = realTriggerEntries.find(([, node]) => {
    const trigger = node.trigger ?? { type: 'manual' as const }
    return node.disabled !== true && trigger.type === 'manual'
  })

  if (!manualTriggerEntry) {
    const chatTriggerEntry = realTriggerEntries.find(([, node]) => {
      const trigger = node.trigger ?? { type: 'manual' as const }
      return node.disabled !== true && trigger.type === 'chat'
    })

    if (!chatTriggerEntry) return null

    const [triggerNodeId, triggerNode] = chatTriggerEntry

    return {
      triggerNodeId,
      trigger: triggerNode.trigger ?? { type: 'chat' },
      runMode: 'chat-panel',
    }
  }

  const [triggerNodeId, triggerNode] = manualTriggerEntry

  return {
    triggerNodeId,
    trigger: triggerNode.trigger ?? { type: 'manual' },
    runMode: 'workflow-run',
  }
}

export function shouldRenderLegacyTriggerNode(workflow: WorkflowItem): boolean {
  const hasRealTriggerNodes = Object.values(workflow.nodes).some(isTriggerNode)
  if (hasRealTriggerNodes) return false

  return workflow.edges.some((edge) => edge.source === 'trigger' || edge.target === 'trigger')
}
