import type { BaseCanvasPoint, BaseCanvasRect } from './types.ts'

export function rectFromPoints(start: BaseCanvasPoint, end: BaseCanvasPoint): BaseCanvasRect {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

export function rectsIntersect(a: BaseCanvasRect, b: BaseCanvasRect): boolean {
  return (
    a.x <= b.x + b.width
    && a.x + a.width >= b.x
    && a.y <= b.y + b.height
    && a.y + a.height >= b.y
  )
}

export function itemToRect(item: { x: number; y: number; width?: number; height?: number }): BaseCanvasRect {
  return {
    x: item.x,
    y: item.y,
    width: item.width ?? 0,
    height: item.height ?? 0,
  }
}
