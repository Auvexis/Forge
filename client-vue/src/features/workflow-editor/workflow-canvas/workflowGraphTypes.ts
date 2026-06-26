import type { Position } from '../components/nodePresentation.types'

export interface WorkflowGraphNode<Data = Record<string, unknown>> {
  id: string
  type?: string
  data: Data
  position?: { x: number; y: number }
  dimensions?: { width: number; height: number }
  computedPosition?: { x: number; y: number }
  selected?: boolean
}

export interface WorkflowGraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  label?: string
  type?: string
}

export interface WorkflowNodeProps<Data = Record<string, unknown>> {
  id: string
  type?: string
  data: Data
  selected?: boolean
  dragging?: boolean
  position?: { x: number; y: number }
  dimensions?: { width: number; height: number }
}

export interface WorkflowHandleElement {
  id?: string | null
  nodeId?: string
  type?: 'source' | 'target'
  position?: Position
  x?: number
  y?: number
  width?: number
  height?: number
}
