import type { PageBlockStyles, PageBlockTag } from '../types/page.types.ts'

export type ResizeCorner = 'north-west' | 'north-east' | 'south-west' | 'south-east'

export interface BlockResizeInput {
  corner: ResizeCorner
  deltaX: number
  deltaY: number
  width: number
  height: number
  maxWidth?: number
  maxHeight?: number
  fontSize: number
  tag: PageBlockTag
  freeAspectRatio: boolean
}

export interface BlockResizeResult {
  styles: PageBlockStyles
  anchorOffset: { x: number; y: number }
  label: string
}

export function calculateBlockResize(input: BlockResizeInput): BlockResizeResult {
  const west = input.corner.endsWith('west')
  const north = input.corner.startsWith('north')
  const widthDelta = input.deltaX * (west ? -1 : 1)
  const heightDelta = input.deltaY * (north ? -1 : 1)
  const maxWidth = Math.max(40, input.maxWidth ?? 4000)
  const maxHeight = Math.max(24, input.maxHeight ?? 4000)
  let width = clamp(Math.round(input.width + widthDelta), 40, maxWidth)
  let height = clamp(Math.round(input.height + heightDelta), 24, maxHeight)

  if (input.tag !== 'text' && !input.freeAspectRatio) {
    const ratio = input.width / Math.max(input.height, 1)
    if (Math.abs(widthDelta) >= Math.abs(heightDelta)) height = Math.max(32, Math.round(width / ratio))
    else width = Math.max(32, Math.round(height * ratio))
    const fitted = fitAspectRatioInside({ width, height, maxWidth, maxHeight, ratio })
    width = fitted.width
    height = fitted.height
  }

  if (input.tag === 'text') {
    const fontSize = clamp(Math.round(input.fontSize + heightDelta / 2), 8, 200)
    return {
      styles: { width: `${width}px`, fontSize: `${fontSize}px` },
      anchorOffset: { x: west ? input.width - width : 0, y: 0 },
      label: `${width} x ${fontSize}px text`,
    }
  }

  return {
    styles: { width: `${width}px`, height: `${height}px` },
    anchorOffset: {
      x: west ? input.width - width : 0,
      y: north ? input.height - height : 0,
    },
    label: `${width} x ${height}px`,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function fitAspectRatioInside(input: { width: number; height: number; maxWidth: number; maxHeight: number; ratio: number }) {
  let width = input.width
  let height = input.height
  if (width > input.maxWidth) {
    width = input.maxWidth
    height = Math.round(width / input.ratio)
  }
  if (height > input.maxHeight) {
    height = input.maxHeight
    width = Math.round(height * input.ratio)
  }
  return {
    width: clamp(width, 40, input.maxWidth),
    height: clamp(height, 24, input.maxHeight),
  }
}
