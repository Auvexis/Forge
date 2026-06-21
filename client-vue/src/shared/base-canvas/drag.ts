import type { BaseCanvasPoint } from './types.ts'
import { snapDeltaToGrid } from './snap.ts'
import { normalizeZoom } from './coordinates.ts'

export interface BaseCanvasDragDeltaInput {
  start: BaseCanvasPoint
  previous: BaseCanvasPoint
  current: BaseCanvasPoint
  zoom: number
  gridSize: number
  snapToGrid: boolean
  bypassSnap: boolean
}

export function getIncrementalDragDelta(input: BaseCanvasDragDeltaInput): {
  delta: BaseCanvasPoint
  nextPrevious: BaseCanvasPoint
} {
  const zoom = normalizeZoom(input.zoom)
  const rawDelta = {
    x: (input.current.x - input.previous.x) / zoom,
    y: (input.current.y - input.previous.y) / zoom,
  }
  const delta = input.snapToGrid && !input.bypassSnap
    ? snapDeltaToGrid(rawDelta, input.gridSize)
    : rawDelta

  return {
    delta,
    nextPrevious: input.current,
  }
}
