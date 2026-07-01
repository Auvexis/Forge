import type { WorkflowNodeType } from './workflow.types'

export interface WorkflowNodeStyle {
  icon: string
  iconColor: string
  bgColor: string
  borderColor: string
}

export type WorkflowNodeRole = 'flow' | 'configuration'
export type WorkflowNodeHandlePosition = 'top' | 'left' | 'bottom' | 'right'

export interface WorkflowNodeCapabilitySelector {
  capability: string
  providerId?: string
  methodId?: string
}

export interface WorkflowNodeHandleDefinition {
  id: string
  label: string
  type: 'source' | 'target'
  position: WorkflowNodeHandlePosition
  style?: 'circle' | 'diamond'
  required?: boolean
  accepts?: WorkflowNodeCapabilitySelector[]
  allowedNodes?: string[] | '*'
  cardinality?: 'one' | 'many'
  connectionPolicy?: 'replace' | 'append'
  quickAdd?: 'capability'
  quickAddAfterConnected?: boolean
}

export interface WorkflowNodePresentation {
  base: 'standard' | 'advanced'
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  borderStyle?: 'default' | 'dashed'
  autoOrganize?: boolean
}

export interface WorkflowNodeCatalogItem {
  type: WorkflowNodeType
  label: string
  description: string
  category: string
  style: WorkflowNodeStyle
  role: WorkflowNodeRole
  capabilities: string[]
  handles: WorkflowNodeHandleDefinition[]
  presentation: WorkflowNodePresentation
  packId: string
  packName: string
}

export interface WorkflowNodeCatalogResponse {
  nodes: WorkflowNodeCatalogItem[]
}
