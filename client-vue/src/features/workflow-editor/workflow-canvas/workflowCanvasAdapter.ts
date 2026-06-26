import type { BaseCanvasItem } from '@/shared/base-canvas/index.ts'

interface WorkflowCanvasNodeLike {
  ui?: {
    positionX?: number
    positionY?: number
  }
}

interface WorkflowCanvasItemSource {
  nodes: Record<string, WorkflowCanvasNodeLike>
  trigger: WorkflowCanvasNodeLike
}

interface WorkflowCanvasAdapterOptions {
  includeLegacyTrigger?: boolean
}

export function workflowToBaseCanvasItems(
  workflow: WorkflowCanvasItemSource,
  options: WorkflowCanvasAdapterOptions = {},
): BaseCanvasItem[] {
  const items = Object.entries(workflow.nodes).map(([nodeId, nodeData]) =>
    workflowNodeToBaseCanvasItem(nodeId, nodeData),
  )

  if (!options.includeLegacyTrigger) return items

  return [
    workflowNodeToBaseCanvasItem('trigger', workflow.trigger),
    ...items,
  ]
}

function workflowNodeToBaseCanvasItem(id: string, node: WorkflowCanvasNodeLike): BaseCanvasItem {
  return {
    id,
    x: node.ui?.positionX ?? 0,
    y: node.ui?.positionY ?? 0,
    data: node,
  }
}
