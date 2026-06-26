import type {
  BaseCanvasItem,
  BaseCanvasPoint,
  BaseCanvasViewport,
} from '../../../shared/base-canvas/index.ts'
import { screenToWorld } from '../../../shared/base-canvas/index.ts'

export interface WorkflowCanvasRect {
  left: number
  top: number
  width: number
  height: number
}

export function getQuickAddAlignedNodePosition(input: {
  sourceHandle: BaseCanvasPoint
  targetHandle: BaseCanvasPoint
  nodePosition: BaseCanvasPoint
  horizontalGap: number
}): BaseCanvasPoint {
  return {
    x: input.nodePosition.x + input.sourceHandle.x + input.horizontalGap - input.targetHandle.x,
    y: input.nodePosition.y + input.sourceHandle.y - input.targetHandle.y,
  }
}

export function screenPointToWorkflowWorld(input: {
  point: BaseCanvasPoint
  canvasRect: WorkflowCanvasRect
  viewport: BaseCanvasViewport
}): BaseCanvasPoint {
  return screenToWorld(
    {
      x: input.point.x - input.canvasRect.left,
      y: input.point.y - input.canvasRect.top,
    },
    input.viewport,
  )
}

export function getWorkflowCanvasCenter(input: {
  canvasRect: WorkflowCanvasRect
  viewport: BaseCanvasViewport
}): BaseCanvasPoint {
  return screenToWorld(
    {
      x: input.canvasRect.width / 2,
      y: input.canvasRect.height / 2,
    },
    input.viewport,
  )
}

export function zoomWorkflowCanvasViewport(input: {
  viewport: BaseCanvasViewport
  canvasRect: WorkflowCanvasRect
  factor: number
  minZoom: number
  maxZoom: number
}): BaseCanvasViewport {
  const nextZoom = Math.min(
    input.maxZoom,
    Math.max(input.minZoom, input.viewport.zoom * input.factor),
  )
  const center = getWorkflowCanvasCenter({ canvasRect: input.canvasRect, viewport: input.viewport })
  return {
    x: input.canvasRect.width / 2 - center.x * nextZoom,
    y: input.canvasRect.height / 2 - center.y * nextZoom,
    zoom: nextZoom,
  }
}

export function getWorkflowCanvasFitViewport(input: {
  items: BaseCanvasItem[]
  canvasRect: WorkflowCanvasRect
  padding?: number
  minZoom: number
  maxZoom: number
}): BaseCanvasViewport | null {
  if (input.items.length === 0) return null

  const padding = input.padding ?? 80
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const item of input.items) {
    minX = Math.min(minX, item.x)
    minY = Math.min(minY, item.y)
    maxX = Math.max(maxX, item.x + (item.width ?? 240))
    maxY = Math.max(maxY, item.y + (item.height ?? 96))
  }

  const width = Math.max(1, maxX - minX)
  const height = Math.max(1, maxY - minY)
  const zoom = Math.min(
    input.maxZoom,
    Math.max(
      input.minZoom,
      Math.min(
        (input.canvasRect.width - padding * 2) / width,
        (input.canvasRect.height - padding * 2) / height,
      ),
    ),
  )

  return {
    x: (input.canvasRect.width - width * zoom) / 2 - minX * zoom,
    y: (input.canvasRect.height - height * zoom) / 2 - minY * zoom,
    zoom,
  }
}
