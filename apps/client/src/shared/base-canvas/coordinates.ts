import type { BaseCanvasPoint, BaseCanvasViewport } from './types.ts'

export function screenToWorld(point: BaseCanvasPoint, viewport: BaseCanvasViewport): BaseCanvasPoint {
  const zoom = normalizeZoom(viewport.zoom)
  return {
    x: (point.x - viewport.x) / zoom,
    y: (point.y - viewport.y) / zoom,
  }
}

export function worldToScreen(point: BaseCanvasPoint, viewport: BaseCanvasViewport): BaseCanvasPoint {
  const zoom = normalizeZoom(viewport.zoom)
  return {
    x: point.x * zoom + viewport.x,
    y: point.y * zoom + viewport.y,
  }
}

export function normalizeZoom(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= 0) return 1
  return zoom
}
