import type { WorkflowNodeType } from './workflow.types'

export interface WorkflowNodeStyle {
  icon: string
  iconColor: string
  bgColor: string
  borderColor: string
}

export interface WorkflowNodeCatalogItem {
  type: WorkflowNodeType
  label: string
  description: string
  category: string
  style: WorkflowNodeStyle
  packId: string
  packName: string
}

export interface WorkflowNodeCatalogResponse {
  nodes: WorkflowNodeCatalogItem[]
}
