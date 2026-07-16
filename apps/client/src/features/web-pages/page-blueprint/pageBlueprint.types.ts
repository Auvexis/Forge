import type { PageActionDefinition } from '@/core/page-actions'
import type { PageActionDocument } from '../types/page.types.ts'

export const PAGE_BLUEPRINT_DOCUMENT_VERSION = 2

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
  width?: number
  height?: number
  actionId?: string
  workflowId?: string
  triggerId?: string
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

export type PageBlueprintScope =
  | { type: 'page'; pageId: string }
  | { type: 'element'; pageId: string; elementId: string; label: string }

export type PageBlueprintDocumentKind = 'design' | 'code' | 'blueprint'

export interface PageBlueprintViewport {
  x: number
  y: number
  zoom: number
}

export interface PageBlueprintDocument {
  version: typeof PAGE_BLUEPRINT_DOCUMENT_VERSION
  scope: PageBlueprintScope
  graph: PageBlueprintGraph
  viewport: PageBlueprintViewport
  selectedNodeIds: string[]
  updatedAt: string
}

export interface PageBlueprintDocumentTab {
  id: string
  kind: PageBlueprintDocumentKind
  label: string
  detail?: string
  icon: string
  closable: boolean
  dirty?: boolean
  scope?: PageBlueprintScope
}

export interface PageBlueprintGraphInput {
  selectedAction: PageActionDefinition | null
  pageActions?: PageActionDocument | null
}
