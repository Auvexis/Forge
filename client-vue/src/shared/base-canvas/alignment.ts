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
  guide: BaseCanvasAlignmentGuide
}

const DEFAULT_ALIGNMENT_THRESHOLD = 6

export function snapRectToAlignment(input: SnapRectToAlignmentInput): {
  delta: BaseCanvasPoint
  guides: BaseCanvasAlignmentGuide[]
} {
  const threshold = input.threshold ?? DEFAULT_ALIGNMENT_THRESHOLD
  const xCandidate = closestCandidate(rectAnchors(input.rect, 'x'), input.targets, 'x', threshold)
  const yCandidate = closestCandidate(rectAnchors(input.rect, 'y'), input.targets, 'y', threshold)

  return {
    delta: {
      x: xCandidate?.delta ?? 0,
      y: yCandidate?.delta ?? 0,
    },
    guides: [xCandidate?.guide, yCandidate?.guide].filter((guide): guide is BaseCanvasAlignmentGuide => Boolean(guide)),
  }
}

function closestCandidate(
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
        if (best && Math.abs(best.delta) <= Math.abs(delta)) continue
        best = {
          delta,
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
