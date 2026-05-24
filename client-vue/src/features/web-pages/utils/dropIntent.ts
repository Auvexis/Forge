import type { DropEdge } from '../stores/page-editor.store.ts'
import type { InsertPosition } from './blockTree.ts'

export interface BlockDropIntentInput {
  x: number
  y: number
  width: number
  height: number
  isContainer: boolean
}

export interface BlockDropIntent {
  position: InsertPosition
  dropEdge: DropEdge
}

const VERTICAL_EDGE_RATIO = 0.25
const HORIZONTAL_EDGE_RATIO = 0.18

export function resolveBlockDropIntent(input: BlockDropIntentInput): BlockDropIntent {
  const width = Math.max(input.width, 1)
  const height = Math.max(input.height, 1)
  const x = clamp(input.x / width, 0, 1)
  const y = clamp(input.y / height, 0, 1)

  if (y <= VERTICAL_EDGE_RATIO) return { position: 'before', dropEdge: 'top' }
  if (y >= 1 - VERTICAL_EDGE_RATIO) return { position: 'after', dropEdge: 'bottom' }

  const dropEdge = resolveHorizontalEdge(x)
  return {
    position: input.isContainer ? 'inside' : 'after',
    dropEdge,
  }
}

function resolveHorizontalEdge(x: number): DropEdge {
  if (x <= HORIZONTAL_EDGE_RATIO) return 'left'
  if (x >= 1 - HORIZONTAL_EDGE_RATIO) return 'right'
  return 'center'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
