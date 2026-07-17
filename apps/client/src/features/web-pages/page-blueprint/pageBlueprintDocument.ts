import type { BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import type { PageBlueprintConnection, PageBlueprintNode } from './pageBlueprintSchema.ts'

export const PAGE_BLUEPRINT_DOCUMENT_PATH = 'blueprints/project.blueprint.json'
export const PAGE_BLUEPRINT_DOCUMENT_SCHEMA_VERSION = 1

export interface PageBlueprintNodeLayout {
  x: number
  y: number
}

export interface PageBlueprintDocument {
  schemaVersion: 1
  viewport: BaseCanvasViewport
  nodeLayouts: Record<string, PageBlueprintNodeLayout>
  nodes: PageBlueprintNode[]
  connections: PageBlueprintConnection[]
  collapsedGroups: string[]
  updatedAt: string
}

export function createDefaultPageBlueprintDocument(): PageBlueprintDocument {
  return {
    schemaVersion: PAGE_BLUEPRINT_DOCUMENT_SCHEMA_VERSION,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodeLayouts: {},
    nodes: [],
    connections: [],
    collapsedGroups: [],
    updatedAt: new Date().toISOString(),
  }
}

export function parsePageBlueprintDocument(content: string | undefined): PageBlueprintDocument {
  if (!content?.trim()) return createDefaultPageBlueprintDocument()

  try {
    const parsed = JSON.parse(content) as Partial<PageBlueprintDocument>
    return normalizePageBlueprintDocument(parsed)
  } catch {
    return createDefaultPageBlueprintDocument()
  }
}

export function serializePageBlueprintDocument(document: PageBlueprintDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`
}

function normalizePageBlueprintDocument(input: Partial<PageBlueprintDocument>): PageBlueprintDocument {
  return {
    schemaVersion: PAGE_BLUEPRINT_DOCUMENT_SCHEMA_VERSION,
    viewport: normalizeViewport(input.viewport),
    nodeLayouts: normalizeNodeLayouts(input.nodeLayouts ?? input.nodes),
    nodes: normalizeBlueprintNodes(input.nodes),
    connections: normalizeConnections(input.connections),
    collapsedGroups: Array.isArray(input.collapsedGroups) ? input.collapsedGroups.filter((id) => typeof id === 'string') : [],
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString(),
  }
}

function normalizeViewport(viewport: PageBlueprintDocument['viewport'] | undefined): BaseCanvasViewport {
  return {
    x: finiteNumber(viewport?.x, 0),
    y: finiteNumber(viewport?.y, 0),
    zoom: finiteNumber(viewport?.zoom, 1),
  }
}

function normalizeNodeLayouts(nodes: PageBlueprintDocument['nodeLayouts'] | unknown): Record<string, PageBlueprintNodeLayout> {
  if (!nodes || typeof nodes !== 'object') return {}
  return Object.fromEntries(
    Object.entries(nodes as Record<string, PageBlueprintNodeLayout>)
      .filter(([id, layout]) => typeof id === 'string' && layout && typeof layout === 'object')
      .map(([id, layout]) => [id, {
        x: finiteNumber(layout.x, 0),
        y: finiteNumber(layout.y, 0),
      }]),
  )
}

function normalizeBlueprintNodes(nodes: unknown): PageBlueprintNode[] {
  if (!Array.isArray(nodes)) return []
  return nodes.filter(isBlueprintNode).map((node) => ({
    ...node,
    fields: node.fields.filter(isBlueprintField),
  }))
}

function normalizeConnections(connections: unknown): PageBlueprintConnection[] {
  if (!Array.isArray(connections)) return []
  return connections.filter(isBlueprintConnection)
}

function isBlueprintNode(value: unknown): value is PageBlueprintNode {
  if (!value || typeof value !== 'object') return false
  const node = value as PageBlueprintNode
  return typeof node.id === 'string'
    && (node.kind === 'element' || node.kind === 'utility')
    && typeof node.type === 'string'
    && typeof node.label === 'string'
    && Array.isArray(node.fields)
}

function isBlueprintField(value: unknown): value is PageBlueprintNode['fields'][number] {
  if (!value || typeof value !== 'object') return false
  const field = value as PageBlueprintNode['fields'][number]
  return typeof field.id === 'string'
    && typeof field.label === 'string'
    && ['input', 'output', 'both'].includes(field.direction)
}

function isBlueprintConnection(value: unknown): value is PageBlueprintConnection {
  if (!value || typeof value !== 'object') return false
  const connection = value as PageBlueprintConnection
  return typeof connection.id === 'string'
    && isConnectionEndpoint(connection.from)
    && isConnectionEndpoint(connection.to)
    && typeof connection.expression === 'string'
}

function isConnectionEndpoint(value: unknown): value is PageBlueprintConnection['from'] {
  if (!value || typeof value !== 'object') return false
  const endpoint = value as PageBlueprintConnection['from']
  return typeof endpoint.nodeId === 'string' && typeof endpoint.fieldId === 'string'
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
