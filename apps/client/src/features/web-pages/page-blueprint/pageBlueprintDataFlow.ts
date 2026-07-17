import type { PageBlueprintDocument } from './pageBlueprintDocument.ts'
import type {
  PageBlueprintField,
  PageBlueprintFieldMode,
  PageBlueprintFieldSchema,
  PageBlueprintFieldType,
  PageBlueprintNode,
} from './pageBlueprintSchema.ts'
import { PAGE_BLUEPRINT_ITEM_PATH_MARKER } from './pageBlueprintRepeaters.ts'

export type PageBlueprintDataResolveMode = 'test' | 'empty'

export interface PageBlueprintDataOutput {
  nodeId: string
  fieldId: string
  label: string
  type: PageBlueprintFieldType
  mode: PageBlueprintFieldMode
  schema: PageBlueprintFieldSchema[]
  sampleValue?: unknown
}

export interface PageBlueprintDataPath {
  node: PageBlueprintNode
  field: PageBlueprintField
  segments: string[]
}

export interface PageBlueprintDataFlowContext {
  document: PageBlueprintDocument
  nodes: Map<string, PageBlueprintNode>
}

export function createBlueprintDataFlowContext(document: PageBlueprintDocument): PageBlueprintDataFlowContext {
  return {
    document,
    nodes: new Map(document.nodes.map((node) => [node.id, node])),
  }
}

export function createBlueprintDataOutputs(
  context: PageBlueprintDataFlowContext,
  mode: PageBlueprintDataResolveMode = 'test',
): PageBlueprintDataOutput[] {
  return context.document.nodes.flatMap((node) =>
    node.fields
      .filter((field) => field.direction === 'output' || field.direction === 'both')
      .filter((field) => field.type !== 'event')
      .map((field) => {
        const sampleValue = resolveBlueprintFieldValue(node, field, mode)
        return {
          nodeId: node.id,
          fieldId: field.id,
          label: field.label,
          type: field.type ?? inferBlueprintFieldType(sampleValue),
          mode: field.mode ?? inferBlueprintFieldMode(sampleValue),
          schema: field.schema ?? inferBlueprintFieldSchema(sampleValue),
          sampleValue,
        }
      }),
  )
}

export function resolveBlueprintDataPath(
  context: PageBlueprintDataFlowContext,
  path: string,
  mode: PageBlueprintDataResolveMode = 'test',
): unknown {
  const parsed = parseBlueprintDataPath(context, path)
  if (!parsed) return undefined
  const value = resolveBlueprintFieldValue(parsed.node, parsed.field, mode)
  return resolveObjectPath(value, parsed.segments)
}

export function parseBlueprintDataPath(
  context: PageBlueprintDataFlowContext,
  path: string,
): PageBlueprintDataPath | null {
  const node = [...context.nodes.values()]
    .sort((a, b) => b.id.length - a.id.length)
    .find((candidate) => path === candidate.id || path.startsWith(`${candidate.id}.`))
  if (!node) return null

  const nodeRemainder = path.slice(node.id.length).replace(/^\./, '')
  const field = [...node.fields]
    .sort((a, b) => b.id.length - a.id.length)
    .find((candidate) => nodeRemainder === candidate.id || nodeRemainder.startsWith(`${candidate.id}.`))
  if (!field) return null

  const fieldRemainder = nodeRemainder.slice(field.id.length).replace(/^\./, '')
  return {
    node,
    field,
    segments: fieldRemainder ? fieldRemainder.split('.').filter(Boolean) : [],
  }
}

export function createBlueprintReturnFieldsFromResult(result: unknown): PageBlueprintField[] {
  const isMultiple = Array.isArray(result)
  const sample = isMultiple ? result[0] : result

  if (isRecord(sample)) {
    return Object.entries(sample).flatMap(([key, value]) => {
      const field: PageBlueprintField = {
        id: `return:${key}`,
        label: formatFieldLabel(key),
        type: inferBlueprintFieldType(value),
        direction: 'output',
        mode: isMultiple ? 'multiple' : inferBlueprintFieldMode(value),
        schema: inferBlueprintFieldSchema(value),
        configurable: false,
      }
      return [field, ...createBlueprintItemFields(field.id, field.label, value)]
    })
  }

  const field: PageBlueprintField = {
    id: 'return',
    label: 'Return',
    type: inferBlueprintFieldType(result),
    direction: 'output',
    mode: isMultiple ? 'multiple' : 'single',
    schema: inferBlueprintFieldSchema(result),
    configurable: false,
  }
  return [field, ...createBlueprintItemFields(field.id, field.label, result)]
}

export function inferBlueprintFieldType(value: unknown): PageBlueprintFieldType {
  if (Array.isArray(value)) return 'array'
  if (value === null || value === undefined) return 'unknown'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'object') return 'object'
  return 'unknown'
}

export function inferBlueprintFieldMode(value: unknown): PageBlueprintFieldMode {
  return Array.isArray(value) ? 'multiple' : 'single'
}

export function inferBlueprintFieldSchema(value: unknown): PageBlueprintFieldSchema[] {
  const sample = Array.isArray(value) ? value[0] : value
  if (!isRecord(sample)) return []

  return Object.entries(sample).map(([key, item]) => ({
    id: key,
    label: formatFieldLabel(key),
    type: inferBlueprintFieldType(item),
    mode: inferBlueprintFieldMode(item),
    fields: inferBlueprintFieldSchema(item),
  }))
}

function resolveBlueprintFieldValue(
  node: PageBlueprintNode,
  field: PageBlueprintField,
  mode: PageBlueprintDataResolveMode,
): unknown {
  if (field.type === 'event') return undefined
  if (node.type === 'run-workflow') return resolveRunWorkflowFieldValue(node, field, mode)

  const samples = isRecord(node.data?.outputSamples) ? node.data.outputSamples : {}
  if (field.id in samples) return samples[field.id]
  return parseFieldValue(field.value)
}

function resolveRunWorkflowFieldValue(
  node: PageBlueprintNode,
  field: PageBlueprintField,
  mode: PageBlueprintDataResolveMode,
): unknown {
  if (mode === 'empty') return undefined
  const result = testResultForNode(node)
  if (result === undefined) return undefined
  if (field.id.includes(PAGE_BLUEPRINT_ITEM_PATH_MARKER)) {
    return resolveBlueprintItemFieldValue(result, field.id)
  }
  if (field.id === 'return') return result
  if (field.id.startsWith('return:')) return resolveObjectPath(result, [field.id.slice('return:'.length)])
  return resolveObjectPath(result, [field.id])
}

function createBlueprintItemFields(
  collectionFieldId: string,
  collectionLabel: string,
  value: unknown,
): PageBlueprintField[] {
  const collection = Array.isArray(value) ? value : null
  const sample = collection ? collection[0] : null
  if (!isRecord(sample)) return []

  return Object.entries(sample).flatMap(([key, item]) => {
    const id = `${collectionFieldId}${PAGE_BLUEPRINT_ITEM_PATH_MARKER}.${key}`
    const label = `${collectionLabel} / ${formatFieldLabel(key)}`
    const field: PageBlueprintField = {
      id,
      label,
      type: inferBlueprintFieldType(item),
      direction: 'output',
      mode: 'single',
      schema: inferBlueprintFieldSchema(item),
      configurable: false,
    }
    return [field, ...createNestedBlueprintItemFields(id, label, item)]
  })
}

function createNestedBlueprintItemFields(
  parentFieldId: string,
  parentLabel: string,
  value: unknown,
): PageBlueprintField[] {
  if (!isRecord(value)) return []
  return Object.entries(value).flatMap(([key, item]) => {
    const id = `${parentFieldId}.${key}`
    const label = `${parentLabel} / ${formatFieldLabel(key)}`
    const field: PageBlueprintField = {
      id,
      label,
      type: inferBlueprintFieldType(item),
      direction: 'output',
      mode: 'single',
      schema: inferBlueprintFieldSchema(item),
      configurable: false,
    }
    return [field, ...createNestedBlueprintItemFields(id, label, item)]
  })
}

function resolveBlueprintItemFieldValue(result: unknown, fieldId: string) {
  const markerIndex = fieldId.indexOf(PAGE_BLUEPRINT_ITEM_PATH_MARKER)
  const collectionFieldId = fieldId.slice(0, markerIndex)
  const itemPath = fieldId.slice(markerIndex + PAGE_BLUEPRINT_ITEM_PATH_MARKER.length).replace(/^\./, '')
  const collection = collectionFieldId === 'return'
    ? result
    : collectionFieldId.startsWith('return:')
      ? resolveObjectPath(result, [collectionFieldId.slice('return:'.length)])
      : resolveObjectPath(result, [collectionFieldId])
  if (!Array.isArray(collection)) return undefined
  return collection.map((item) => resolveObjectPath(item, itemPath ? itemPath.split('.') : []))
}

function testResultForNode(node: PageBlueprintNode) {
  const json = node.data?.testResultJson
  if (typeof json !== 'string') return undefined
  try {
    return JSON.parse(json)
  } catch {
    return undefined
  }
}

function resolveObjectPath(value: unknown, segments: string[]) {
  if (segments.length === 0) return value
  let current = value
  for (const segment of segments) {
    if (current == null) return undefined
    if (/^\d+$/.test(segment) && Array.isArray(current)) {
      current = current[Number(segment)]
      continue
    }
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function parseFieldValue(value: unknown) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function formatFieldLabel(key: string) {
  const normalized = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : key
}
