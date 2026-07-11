import type { BaseCanvasPoint } from '@/shared/base-canvas/index.ts'

export type WorkflowEdgeStatus = 'idle' | 'success' | 'failed' | 'running' | 'waiting' | 'retrying'

export interface WorkflowEdgeNodeState {
  status?: WorkflowEdgeStatus | string
  output?: unknown
}

export interface WorkflowEdgeStatusInput {
  source: string
  target: string
  sourceHandle?: string | null
  nodeStatuses: Record<string, WorkflowEdgeNodeState | undefined>
  workflowStatus?: string | null
}

export interface WorkflowEdgePathData {
  path: string
  labelX: number
  labelY: number
  routing: 'smooth' | 'pipe'
}

const PIPE_THRESHOLD = 80
const PIPE_STUB = 40
const PIPE_DETOUR = 80
const PIPE_RADIUS = 8

export function makeWorkflowEdgePath(source: BaseCanvasPoint, target: BaseCanvasPoint): WorkflowEdgePathData {
  const horizontalGap = target.x - source.x
  if (horizontalGap < PIPE_THRESHOLD) return makeWorkflowPipePath(source, target)

  const horizontalPull = Math.max(40, Math.abs(target.x - source.x) * 0.45)
  const sourcePull = source.x <= target.x ? horizontalPull : -horizontalPull
  const targetPull = source.x <= target.x ? -horizontalPull : horizontalPull

  return {
    path: `M ${source.x} ${source.y} C ${source.x + sourcePull} ${source.y}, ${target.x + targetPull} ${target.y}, ${target.x} ${target.y}`,
    labelX: (source.x + target.x) / 2,
    labelY: (source.y + target.y) / 2,
    routing: 'smooth',
  }
}

function makeWorkflowPipePath(source: BaseCanvasPoint, target: BaseCanvasPoint): WorkflowEdgePathData {
  const horizontalGap = target.x - source.x
  if (horizontalGap >= 0) {
    const middleX = (source.x + target.x) / 2
    return {
      path: roundedOrthogonalPath([
        source,
        { x: middleX, y: source.y },
        { x: middleX, y: target.y },
        target,
      ]),
      labelX: middleX,
      labelY: (source.y + target.y) / 2,
      routing: 'pipe',
    }
  }

  const direction = target.y >= source.y ? 1 : -1
  const middleY = Math.abs(target.y - source.y) < PIPE_DETOUR
    ? source.y + PIPE_DETOUR * direction
    : (source.y + target.y) / 2
  const sourceStubX = source.x + PIPE_STUB
  const targetStubX = target.x - PIPE_STUB

  return {
    path: roundedOrthogonalPath([
      source,
      { x: sourceStubX, y: source.y },
      { x: sourceStubX, y: middleY },
      { x: targetStubX, y: middleY },
      { x: targetStubX, y: target.y },
      target,
    ]),
    labelX: (sourceStubX + targetStubX) / 2,
    labelY: middleY,
    routing: 'pipe',
  }
}

function roundedOrthogonalPath(points: BaseCanvasPoint[]): string {
  const parts = [`M ${points[0]!.x} ${points[0]!.y}`]

  for (let index = 1; index < points.length - 1; index++) {
    const previous = points[index - 1]!
    const current = points[index]!
    const next = points[index + 1]!
    const incoming = Math.min(PIPE_RADIUS, distance(previous, current) / 2)
    const outgoing = Math.min(PIPE_RADIUS, distance(current, next) / 2)
    const before = moveToward(current, previous, incoming)
    const after = moveToward(current, next, outgoing)
    parts.push(`L ${before.x} ${before.y} Q ${current.x} ${current.y} ${after.x} ${after.y}`)
  }

  const end = points.at(-1)!
  parts.push(`L ${end.x} ${end.y}`)
  return parts.join(' ')
}

function distance(a: BaseCanvasPoint, b: BaseCanvasPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function moveToward(from: BaseCanvasPoint, to: BaseCanvasPoint, amount: number): BaseCanvasPoint {
  const length = distance(from, to)
  if (length === 0) return from
  return {
    x: from.x + (to.x - from.x) * amount / length,
    y: from.y + (to.y - from.y) * amount / length,
  }
}

export function makeConfigurationWorkflowEdgePath(source: BaseCanvasPoint, target: BaseCanvasPoint): WorkflowEdgePathData {
  const verticalGap = Math.abs(source.y - target.y)
  const pull = Math.min(180, Math.max(72, verticalGap * 0.55))
  const sourcePull = source.y > target.y ? -pull : pull
  const targetPull = target.y > source.y ? -pull : pull

  return {
    path: `M ${source.x} ${source.y} C ${source.x} ${source.y + sourcePull}, ${target.x} ${target.y + targetPull}, ${target.x} ${target.y}`,
    labelX: (source.x + target.x) / 2,
    labelY: (source.y + target.y) / 2,
    routing: 'smooth',
  }
}

export function getWorkflowEdgeStatus(input: WorkflowEdgeStatusInput): WorkflowEdgeStatus | string {
  const sourceStatus = resolveSourceStatus(input)
  const targetStatus = input.nodeStatuses[input.target]?.status ?? 'idle'

  if (sourceStatus === 'idle') return 'idle'

  if (sourceStatus === 'success' && !isSelectedSourceHandleActive(input)) {
    return 'idle'
  }

  if (targetStatus !== 'idle') return targetStatus
  if (sourceStatus === 'success') return 'success'
  return 'idle'
}

export function countWorkflowEdgeItems(output: unknown): number | null {
  if (Array.isArray(output)) return output.length

  if (output && typeof output === 'object') {
    const value = output as Record<string, unknown>
    if (Array.isArray(value.items)) return value.items.length
    if (Array.isArray(value.data)) return value.data.length
  }

  return null
}

export function workflowEdgeStrokeFor(status: WorkflowEdgeStatus | string, selected: boolean): string {
  if (selected) return 'var(--fabric-rf-edge-stroke-selected)'

  switch (status) {
    case 'success':
      return 'var(--fabric-green-500, #22c55e)'
    case 'failed':
      return 'var(--fabric-red-500, #ef4444)'
    case 'running':
      return 'var(--fabric-amber-500, #f59e0b)'
    case 'waiting':
      return 'var(--fabric-purple-500, #a855f7)'
    case 'retrying':
      return 'var(--fabric-amber-500, #f59e0b)'
    default:
      return 'var(--fabric-rf-edge-stroke)'
  }
}

function resolveSourceStatus(input: WorkflowEdgeStatusInput): WorkflowEdgeStatus | string {
  if (input.source === 'trigger' || input.source.startsWith('trigger_')) {
    const triggerStatus = input.nodeStatuses[input.source]?.status
    if (triggerStatus && triggerStatus !== 'idle') return triggerStatus
    return input.workflowStatus === 'SUCCESS' ? 'success' : 'idle'
  }

  return input.nodeStatuses[input.source]?.status ?? 'idle'
}

function isSelectedSourceHandleActive(input: WorkflowEdgeStatusInput): boolean {
  const output = input.nodeStatuses[input.source]?.output
  if (!output || typeof output !== 'object') return true

  const value = output as Record<string, unknown>
  if ('branch' in value) return value.branch === (input.sourceHandle || 'then')
  if ('activeHandle' in value) return value.activeHandle === input.sourceHandle

  return true
}
