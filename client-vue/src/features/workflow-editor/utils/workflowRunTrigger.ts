import type { TriggerNode, WorkflowItem, WorkflowNode, WorkflowTrigger } from '@/core/types/workflow.types'

export interface ToolbarRunTrigger {
  triggerNodeId: string
  trigger: WorkflowTrigger
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
    }
  }

  const manualTriggerEntry = realTriggerEntries.find(([, node]) => {
    const trigger = node.trigger ?? { type: 'manual' as const }
    return node.disabled !== true && trigger.type === 'manual'
  })

  if (!manualTriggerEntry) return null

  const [triggerNodeId, triggerNode] = manualTriggerEntry

  return {
    triggerNodeId,
    trigger: triggerNode.trigger ?? { type: 'manual' },
  }
}
