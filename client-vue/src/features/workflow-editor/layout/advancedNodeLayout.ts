import type { NodeSide } from '../components/nodePresentation.types'

export const ADVANCED_CHILD_SIZE = 100
export const ADVANCED_LAYOUT = {
  primaryGap: 85,
  crossGap: 65,
  rowGap: 85,
  maxPerRow: 4,
} as const

export interface AdvancedParentBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface AdvancedChildPositionInput {
  parent: AdvancedParentBounds
  side: NodeSide
  handlerIndex: number
  handlerCount: number
  siblingIndex: number
}

export function getAdvancedChildPosition(input: AdvancedChildPositionInput): { x: number; y: number } {
  const handlerCount = Math.max(1, input.handlerCount)
  const handlerIndex = Math.min(Math.max(0, input.handlerIndex), handlerCount - 1)
  const column = input.siblingIndex % ADVANCED_LAYOUT.maxPerRow
  const row = Math.floor(input.siblingIndex / ADVANCED_LAYOUT.maxPerRow)
  const crossOffset = column * (ADVANCED_CHILD_SIZE + ADVANCED_LAYOUT.crossGap)
  const primaryOffset = row * (ADVANCED_CHILD_SIZE + ADVANCED_LAYOUT.rowGap)

  if (input.side === 'top' || input.side === 'bottom') {
    const trackCenter = input.parent.x + ((handlerIndex + 0.5) / handlerCount) * input.parent.width
    return {
      x: trackCenter - ADVANCED_CHILD_SIZE / 2 + crossOffset,
      y: input.side === 'bottom'
        ? input.parent.y + input.parent.height + ADVANCED_LAYOUT.primaryGap + primaryOffset
        : input.parent.y - ADVANCED_LAYOUT.primaryGap - ADVANCED_CHILD_SIZE - primaryOffset,
    }
  }

  const trackCenter = input.parent.y + ((handlerIndex + 0.5) / handlerCount) * input.parent.height
  return {
    x: input.side === 'right'
      ? input.parent.x + input.parent.width + ADVANCED_LAYOUT.primaryGap + primaryOffset
      : input.parent.x - ADVANCED_LAYOUT.primaryGap - ADVANCED_CHILD_SIZE - primaryOffset,
    y: trackCenter - ADVANCED_CHILD_SIZE / 2 + crossOffset,
  }
}
