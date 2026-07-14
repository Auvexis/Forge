import type { PageActionDefinition } from '@/core/page-actions'
import type { PageActionDocument } from '../types/page.types.ts'

export type PageBlueprintNodeKind =
  | 'event'
  | 'workflow-action'
  | 'input-binding'
  | 'result-binding'
  | 'collection-binding'
  | 'javascript'
  | 'element'

export interface PageBlueprintNode {
  id: string
  kind: PageBlueprintNodeKind
  label: string
  detail?: string
  icon: string
  x: number
  y: number
}

export interface PageBlueprintEdge {
  id: string
  from: string
  to: string
  label?: string
}

export interface PageBlueprintGraph {
  nodes: PageBlueprintNode[]
  edges: PageBlueprintEdge[]
}

export interface PageBlueprintGraphInput {
  selectedAction: PageActionDefinition | null
  pageActions?: PageActionDocument | null
}
