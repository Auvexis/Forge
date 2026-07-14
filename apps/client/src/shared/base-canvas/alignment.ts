import type { BaseCanvasPoint, BaseCanvasRect } from './types.ts'

export interface BaseCanvasAlignmentGuide {
  axis: 'x' | 'y'
  position: number
  start: number
  end: number
}

export interface SnapRectToAlignmentInput {
  rect: BaseCanvasRect
  targets: BaseCanvasRect[]
  threshold?: number
}

interface SnapCandidate {
  delta: number
  targetDistance: number
  guide: BaseCanvasAlignmentGuide
}

const DEFAULT_ALIGNMENT_THRESHOLD = 6

export function snapRectToAlignment(input: SnapRectToAlignmentInput): {
  delta: BaseCanvasPoint
  guides: BaseCanvasAlignmentGuide[]
} {
  const threshold = input.threshold ?? DEFAULT_ALIGNMENT_THRESHOLD
  const xCandidate = closestCandidate(
    input.rect,
    rectAnchors(input.rect, 'x'),
    input.targets,
    'x',
    threshold,
  )
  const yCandidate = closestCandidate(
    input.rect,
    rectAnchors(input.rect, 'y'),
    input.targets,
    'y',
    threshold,
  )

  return {
    delta: {
      x: xCandidate?.delta ?? 0,
      y: yCandidate?.delta ?? 0,
    },
    guides: [xCandidate?.guide, yCandidate?.guide].filter((guide): guide is BaseCanvasAlignmentGuide => Boolean(guide)),
  }
}

function closestCandidate(
  rect: BaseCanvasRect,
  anchors: Array<{ value: number; start: number; end: number }>,
  targets: BaseCanvasRect[],
  axis: 'x' | 'y',
  threshold: number,
): SnapCandidate | null {
  let best: SnapCandidate | null = null
  for (const anchor of anchors) {
    for (const target of targets) {
      for (const targetAnchor of rectAnchors(target, axis)) {
        const delta = targetAnchor.value - anchor.value
        if (Math.abs(delta) > threshold) continue
        const targetDistance = rectDistance(rect, target)
        if (
          best &&
          (best.targetDistance < targetDistance ||
            (best.targetDistance === targetDistance && Math.abs(best.delta) <= Math.abs(delta)))
        ) continue
        best = {
          delta,
          targetDistance,
          guide: {
            axis,
            position: targetAnchor.value,
            start: Math.min(anchor.start, targetAnchor.start),
            end: Math.max(anchor.end, targetAnchor.end),
          },
        }
      }
    }
  }
  return best
}

function rectDistance(rect: BaseCanvasRect, target: BaseCanvasRect) {
  const xDistance = intervalDistance(rect.x, rect.x + rect.width, target.x, target.x + target.width)
  const yDistance = intervalDistance(rect.y, rect.y + rect.height, target.y, target.y + target.height)
  return xDistance * xDistance + yDistance * yDistance
}

function intervalDistance(start: number, end: number, targetStart: number, targetEnd: number) {
  if (end < targetStart) return targetStart - end
  if (targetEnd < start) return start - targetEnd
  return 0
}

function rectAnchors(rect: BaseCanvasRect, axis: 'x' | 'y') {
  if (axis === 'x') {
    return [
      { value: rect.x, start: rect.y, end: rect.y + rect.height },
      { value: rect.x + rect.width / 2, start: rect.y, end: rect.y + rect.height },
      { value: rect.x + rect.width, start: rect.y, end: rect.y + rect.height },
    ]
  }
  return [
    { value: rect.y, start: rect.x, end: rect.x + rect.width },
    { value: rect.y + rect.height / 2, start: rect.x, end: rect.x + rect.width },
    { value: rect.y + rect.height, start: rect.x, end: rect.x + rect.width },
  ]
}
