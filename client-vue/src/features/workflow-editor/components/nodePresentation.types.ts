import type { Position } from '@vue-flow/core'

export type NodeSide = 'top' | 'left' | 'bottom' | 'right'
export type NodeRounding = 'sm' | 'md' | 'lg' | 'full'
export type NodeBorderStyle = 'default' | 'dashed'
export type NodeQuickAddMode = 'agent-config' | 'vector-config'

export type AllowedNodeSelector =
  | `node:${string}`
  | `plugin:${string}`
  | `preset:${string}`
  | `capability:${string}`

export type AllowedNodes = '*' | AllowedNodeSelector[]

export interface BaseNodeHandlerDefinition {
  id: string
  label: string
  type: 'source' | 'target'
  position: Position
  required?: boolean
  quickAdd?: NodeQuickAddMode
  allowedNodes: AllowedNodes
}
