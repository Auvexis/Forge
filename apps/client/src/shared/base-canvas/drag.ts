import type { BaseCanvasPoint } from './types.ts'
import { snapDeltaToGrid } from './snap.ts'
import { normalizeZoom } from './coordinates.ts'

export interface BaseCanvasDragDeltaInput {
  start: BaseCanvasPoint
  previous: BaseCanvasPoint
  current: BaseCanvasPoint
  emitted?: BaseCanvasPoint
  zoom: number
  gridSize: number
  snapToGrid: boolean
  bypassSnap: boolean
}

export function getIncrementalDragDelta(input: BaseCanvasDragDeltaInput): {
  delta: BaseCanvasPoint
  nextPrevious: BaseCanvasPoint
  nextEmitted: BaseCanvasPoint
} {
  const zoom = normalizeZoom(input.zoom)
  const rawDelta = {
    x: (input.current.x - input.previous.x) / zoom,
    y: (input.current.y - input.previous.y) / zoom,
  }
  const emitted = input.emitted ?? { x: 0, y: 0 }

  if (input.snapToGrid && !input.bypassSnap) {
    const snappedTotal = snapDeltaToGrid({
      x: (input.current.x - input.start.x) / zoom,
      y: (input.current.y - input.start.y) / zoom,
    }, input.gridSize)

    return {
      delta: {
        x: snappedTotal.x - emitted.x,
        y: snappedTotal.y - emitted.y,
      },
      nextPrevious: input.current,
      nextEmitted: snappedTotal,
    }
  }

  const delta = input.snapToGrid && !input.bypassSnap
    ? snapDeltaToGrid(rawDelta, input.gridSize)
    : rawDelta

  return {
    delta,
    nextPrevious: input.current,
    nextEmitted: {
      x: emitted.x + delta.x,
      y: emitted.y + delta.y,
    },
  }
}
