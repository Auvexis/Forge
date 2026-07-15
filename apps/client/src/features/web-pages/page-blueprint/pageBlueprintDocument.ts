import type { PageActionDefinition } from '@/core/page-actions'
import type { PageActionDocument } from '../types/page.types.ts'
import {
  PAGE_BLUEPRINT_DOCUMENT_VERSION,
  type PageBlueprintDocument,
  type PageBlueprintGraph,
  type PageBlueprintNodeKind,
  type PageBlueprintScope,
} from './pageBlueprint.types.ts'
import { buildPageBlueprintGraph } from './pageBlueprintAdapter.ts'

export interface PageBlueprintDocumentInput {
  pageId: string
  selectedAction: PageActionDefinition | null
  pageActions?: PageActionDocument | null
  scope?: PageBlueprintScope
}

export function createPageBlueprintDocument(input: PageBlueprintDocumentInput): PageBlueprintDocument {
  const scope = input.scope ?? { type: 'page', pageId: input.pageId }
  const existing = findExistingBlueprintDocument(input.pageActions, scope)
  const graph: PageBlueprintGraph = existing?.graph?.nodes?.length
    ? normalizeBlueprintGraph(existing.graph as PageBlueprintGraph)
    : buildPageBlueprintGraph({
      selectedAction: input.selectedAction,
      pageActions: input.pageActions,
    })

  return normalizePageBlueprintDocument({
    version: PAGE_BLUEPRINT_DOCUMENT_VERSION,
    scope,
    graph,
    viewport: existing?.viewport ?? { x: 72, y: 64, zoom: 1 },
    selectedNodeIds: existing?.selectedNodeIds ?? [],
    updatedAt: existing?.updatedAt ?? new Date().toISOString(),
  })
}

export function normalizePageBlueprintDocument(document: PageBlueprintDocument): PageBlueprintDocument {
  return {
    version: PAGE_BLUEPRINT_DOCUMENT_VERSION,
    scope: document.scope,
    graph: normalizeBlueprintGraph(document.graph),
    viewport: {
      x: Number.isFinite(document.viewport?.x) ? document.viewport.x : 72,
      y: Number.isFinite(document.viewport?.y) ? document.viewport.y : 64,
      zoom: Number.isFinite(document.viewport?.zoom) ? document.viewport.zoom : 1,
    },
    selectedNodeIds: Array.isArray(document.selectedNodeIds) ? document.selectedNodeIds : [],
    updatedAt: document.updatedAt || new Date().toISOString(),
  }
}

function normalizeBlueprintGraph(graph: PageBlueprintGraph): PageBlueprintGraph {
  const nodeKinds = new Set<PageBlueprintNodeKind>([
    'event',
    'workflow-action',
    'input-binding',
    'result-binding',
    'collection-binding',
    'javascript',
    'element',
  ])
  return {
    nodes: [...(graph.nodes ?? [])].map((node) => ({
      ...node,
      kind: nodeKinds.has(node.kind as PageBlueprintNodeKind) ? node.kind as PageBlueprintNodeKind : 'element',
    })),
    edges: [...(graph.edges ?? [])],
  }
}

function findExistingBlueprintDocument(
  pageActions: PageActionDocument | null | undefined,
  scope: PageBlueprintScope,
) {
  const documents = pageActions?.blueprints ?? {}
  return documents[blueprintScopeId(scope)]
}

export function blueprintScopeId(scope: PageBlueprintScope) {
  if (scope.type === 'page') return `page:${scope.pageId}`
  return `element:${scope.pageId}:${scope.elementId}`
}

export function blueprintScopeLabel(scope: PageBlueprintScope) {
  if (scope.type === 'page') return 'Page Blueprint'
  return scope.label || scope.elementId
}
