export interface BaseCanvasPoint {
  x: number
  y: number
}

export interface BaseCanvasSize {
  width: number
  height: number
}

export interface BaseCanvasRect extends BaseCanvasPoint, BaseCanvasSize {}

export interface BaseCanvasViewport extends BaseCanvasPoint {
  zoom: number
}

export interface BaseCanvasItem {
  id: string
  x: number
  y: number
  width?: number
  height?: number
  locked?: boolean
  data?: unknown
}

export type BaseCanvasPatternStyle = 'dot' | 'square' | 'none'

export type BaseCanvasMarqueeBorderStyle = 'line' | 'dot' | 'dashed'

export interface BaseCanvasMoveDelta {
  x: number
  y: number
}

export interface BaseCanvasItemsMoveEvent {
  itemIds: string[]
  delta: BaseCanvasMoveDelta
}

export interface BaseCanvasItemDragEvent {
  itemId: string
}

export interface BaseCanvasContextMenuEvent {
  screen: BaseCanvasPoint
  world: BaseCanvasPoint
  target: { type: 'canvas' } | { type: 'item'; itemId: string }
  selection: string[]
}
