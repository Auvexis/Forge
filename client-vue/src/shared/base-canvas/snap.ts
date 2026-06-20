import type { BaseCanvasPoint } from './types.ts'

const DEFAULT_GRID_SIZE = 16

export function snapPointToGrid(point: BaseCanvasPoint, gridSize = DEFAULT_GRID_SIZE): BaseCanvasPoint {
  const size = normalizeGridSize(gridSize)
  return {
    x: Math.round(point.x / size) * size,
    y: Math.round(point.y / size) * size,
  }
}

export function snapDeltaToGrid(delta: BaseCanvasPoint, gridSize = DEFAULT_GRID_SIZE): BaseCanvasPoint {
  return snapPointToGrid(delta, gridSize)
}

export function shouldBypassSnap(event: Pick<KeyboardEvent | MouseEvent | PointerEvent, 'ctrlKey' | 'shiftKey'>): boolean {
  return event.ctrlKey || event.shiftKey
}

export function normalizeGridSize(gridSize: number): number {
  if (!Number.isFinite(gridSize) || gridSize <= 0) return DEFAULT_GRID_SIZE
  return gridSize
}
