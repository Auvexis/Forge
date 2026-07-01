import type { BaseCanvasItem } from '@/shared/base-canvas/index.ts'

interface WorkflowCanvasNodeLike {
  ui?: {
    positionX?: number
    positionY?: number
    width?: number
    height?: number
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
  const item: BaseCanvasItem = {
    id,
    x: node.ui?.positionX ?? 0,
    y: node.ui?.positionY ?? 0,
    data: node,
  }
  if (typeof node.ui?.width === 'number') item.width = node.ui.width
  if (typeof node.ui?.height === 'number') item.height = node.ui.height
  return item
}
