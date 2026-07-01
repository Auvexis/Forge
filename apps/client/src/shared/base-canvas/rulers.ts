import type { BaseCanvasViewport } from './types.ts'

export interface BaseCanvasRulerTick {
  value: number
  position: number
  label: string
  major: boolean
}

export type BaseCanvasRulerAxis = 'x' | 'y'

const MIN_MINOR_TICK_SPACING = 8
const MIN_MAJOR_TICK_SPACING = 48

export function getRulerTicks(params: {
  axis: BaseCanvasRulerAxis
  viewport: BaseCanvasViewport
  length: number
  gridSize?: number
}): BaseCanvasRulerTick[] {
  const zoom = params.viewport.zoom > 0 ? params.viewport.zoom : 1
  const baseStep = normalizeStep(params.gridSize ?? 16)
  const minorStep = scaleStepForSpacing(baseStep, zoom, MIN_MINOR_TICK_SPACING)
  const majorStep = scaleStepForSpacing(minorStep, zoom, MIN_MAJOR_TICK_SPACING)
  const viewportOffset = params.axis === 'x' ? params.viewport.x : params.viewport.y
  const worldStart = -viewportOffset / zoom
  const worldEnd = worldStart + params.length / zoom
  const firstTick = Math.floor(worldStart / minorStep) * minorStep
  const ticks: BaseCanvasRulerTick[] = []

  for (let value = firstTick; value <= worldEnd; value += minorStep) {
    const roundedValue = roundTickValue(value)
    const major = isMajorTick(roundedValue, majorStep)
    ticks.push({
      value: roundedValue,
      position: roundedValue * zoom + viewportOffset,
      label: major ? String(roundedValue) : '',
      major,
    })
  }

  return ticks
}

function scaleStepForSpacing(step: number, zoom: number, minSpacing: number): number {
  let scaledStep = step
  while (scaledStep * zoom < minSpacing) scaledStep *= 2
  return scaledStep
}

function normalizeStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 16
  return step
}

function roundTickValue(value: number): number {
  return Number(value.toFixed(6))
}

function isMajorTick(value: number, majorStep: number): boolean {
  return Math.abs(value / majorStep - Math.round(value / majorStep)) < 0.000001
}
