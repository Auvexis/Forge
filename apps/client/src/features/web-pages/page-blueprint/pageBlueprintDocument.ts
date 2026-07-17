import type { BaseCanvasViewport } from '@/shared/base-canvas/index.ts'

export const PAGE_BLUEPRINT_DOCUMENT_PATH = 'blueprints/project.blueprint.json'
export const PAGE_BLUEPRINT_DOCUMENT_SCHEMA_VERSION = 1

export interface PageBlueprintNodeLayout {
  x: number
  y: number
}

export interface PageBlueprintDocument {
  schemaVersion: 1
  viewport: BaseCanvasViewport
  nodes: Record<string, PageBlueprintNodeLayout>
  collapsedGroups: string[]
  updatedAt: string
}

export function createDefaultPageBlueprintDocument(): PageBlueprintDocument {
  return {
    schemaVersion: PAGE_BLUEPRINT_DOCUMENT_SCHEMA_VERSION,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: {},
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
    nodes: normalizeNodes(input.nodes),
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

function normalizeNodes(nodes: PageBlueprintDocument['nodes'] | undefined): Record<string, PageBlueprintNodeLayout> {
  if (!nodes || typeof nodes !== 'object') return {}
  return Object.fromEntries(
    Object.entries(nodes)
      .filter(([id, layout]) => typeof id === 'string' && layout && typeof layout === 'object')
      .map(([id, layout]) => [id, {
        x: finiteNumber(layout.x, 0),
        y: finiteNumber(layout.y, 0),
      }]),
  )
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
