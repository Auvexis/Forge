import type { DropEdge } from '../stores/page-editor.store.ts'
import type { InsertPosition } from './blockTree.ts'

export interface BlockDropIntentInput {
  x: number
  y: number
  width: number
  height: number
  isContainer: boolean
  previous?: BlockDropIntent | null
}

export interface BlockDropIntent {
  position: InsertPosition
  dropEdge: DropEdge
}

const VERTICAL_EDGE_RATIO = 0.30
const VERTICAL_STICKY_RATIO = 0.08
const HORIZONTAL_EDGE_RATIO = 0.18

export function resolveBlockDropIntent(input: BlockDropIntentInput): BlockDropIntent {
  const width = Math.max(input.width, 1)
  const height = Math.max(input.height, 1)
  const x = clamp(input.x / width, 0, 1)
  const y = clamp(input.y / height, 0, 1)

  const previous = stablePreviousIntent(input.previous, input.isContainer)
  if (previous?.position === 'before' && y <= VERTICAL_EDGE_RATIO + VERTICAL_STICKY_RATIO) {
    return { position: 'before', dropEdge: 'top' }
  }
  if (previous?.position === 'after' && y >= 1 - VERTICAL_EDGE_RATIO - VERTICAL_STICKY_RATIO) {
    return { position: 'after', dropEdge: 'bottom' }
  }
  if (previous?.position === 'inside' && y > VERTICAL_EDGE_RATIO - VERTICAL_STICKY_RATIO && y < 1 - VERTICAL_EDGE_RATIO + VERTICAL_STICKY_RATIO) {
    return { position: 'inside', dropEdge: resolveHorizontalEdge(x) }
  }

  if (y <= VERTICAL_EDGE_RATIO - VERTICAL_STICKY_RATIO) return { position: 'before', dropEdge: 'top' }
  if (y >= 1 - VERTICAL_EDGE_RATIO + VERTICAL_STICKY_RATIO) return { position: 'after', dropEdge: 'bottom' }

  const dropEdge = resolveHorizontalEdge(x)
  return {
    position: input.isContainer ? 'inside' : 'after',
    dropEdge,
  }
}

function stablePreviousIntent(previous: BlockDropIntent | null | undefined, isContainer: boolean) {
  if (!previous) return null
  if (previous.position === 'inside' && !isContainer) return null
  return previous
}

function resolveHorizontalEdge(x: number): DropEdge {
  if (x <= HORIZONTAL_EDGE_RATIO) return 'left'
  if (x >= 1 - HORIZONTAL_EDGE_RATIO) return 'right'
  return 'center'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
