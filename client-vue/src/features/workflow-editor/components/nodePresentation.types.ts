export type NodeSide = 'top' | 'left' | 'bottom' | 'right'
export const Position = {
  Top: 'top',
  Right: 'right',
  Bottom: 'bottom',
  Left: 'left',
} as const
export type Position = typeof Position[keyof typeof Position]
export type NodeRounding = 'sm' | 'md' | 'lg' | 'full'
export type NodeBorderStyle = 'default' | 'dashed'
export type NodeQuickAddMode = 'agent-config' | 'vector-config' | 'capability'
export type NodeHandleStyle = 'circle' | 'diamond'

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
  style?: NodeHandleStyle
  required?: boolean
  quickAdd?: NodeQuickAddMode
  quickAddAfterConnected?: boolean
  accepts?: Array<{ capability: string; providerId?: string; methodId?: string }>
  cardinality?: 'one' | 'many'
  connectionPolicy?: 'replace' | 'append'
  allowedNodes: AllowedNodes
}
