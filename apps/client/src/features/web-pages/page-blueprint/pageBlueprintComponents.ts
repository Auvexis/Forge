import type { PageBlock } from '../types/page.types.ts'
import type { PageBlueprintDocument } from './pageBlueprintDocument.ts'
import type {
  PageBlueprintComponent,
  PageBlueprintComponentNode,
  PageBlueprintComponentPort,
  PageBlueprintField,
  PageBlueprintNode,
} from './pageBlueprintSchema.ts'
import { PAGE_BLUEPRINT_REPEAT_FIELD_ID } from './pageBlueprintRepeaters.ts'

export const PAGE_BLUEPRINT_COMPONENT_NODE_PREFIX = 'blueprint-component:'

export function createPageComponentFromNodeSelection(input: {
  document: PageBlueprintDocument
  blocks: PageBlock[]
  nodeIds: string[]
}): { component: PageBlueprintComponent; node: PageBlueprintComponentNode; layout: { x: number; y: number } } | null {
  const selectedNodeIds = normalizeComponentSelection(input.nodeIds, input.blocks)
  const selectedNodes = selectedNodeIds
    .map((nodeId) => input.document.nodes.find((node) => node.id === nodeId))
    .filter((node): node is PageBlueprintNode => Boolean(node))

  if (selectedNodes.length === 0) return null

  const now = new Date().toISOString()
  const componentId = `page-component:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`
  const rootNodeId = selectedNodeIds[0]!
  const rootElementId = elementIdFromNodeId(rootNodeId)
  const name = componentNameFromRoot(rootNodeId, input.blocks, input.document.components.length + 1)
  const props = createComponentPorts(selectedNodes, 'prop')
  const events = createComponentPorts(selectedNodes, 'event')
  const component: PageBlueprintComponent = {
    id: componentId,
    name,
    rootNodeId,
    rootElementId: rootElementId || undefined,
    nodeIds: selectedNodeIds,
    props,
    events,
    createdAt: now,
    updatedAt: now,
  }
  const node: PageBlueprintComponentNode = {
    id: componentNodeId(componentId),
    kind: 'component',
    type: 'page-component',
    componentId,
    label: name,
    icon: 'component',
    accent: 'var(--fabric-accent)',
    fields: createComponentNodeFields(component),
    data: {},
  }

  return {
    component,
    node,
    layout: componentNodeLayout(selectedNodeIds, input.document.nodeLayouts),
  }
}

export function componentNodeId(componentId: string) {
  return `${PAGE_BLUEPRINT_COMPONENT_NODE_PREFIX}${componentId}`
}

export function componentIdFromNodeId(nodeId: string) {
  return nodeId.startsWith(PAGE_BLUEPRINT_COMPONENT_NODE_PREFIX)
    ? nodeId.slice(PAGE_BLUEPRINT_COMPONENT_NODE_PREFIX.length)
    : ''
}

export function createComponentNodeFields(component: PageBlueprintComponent): PageBlueprintField[] {
  return [
    componentRepeatField(),
    ...component.events.map((event) => componentPortField(event, 'event')),
    ...component.props.map((prop) => componentPortField(prop, 'prop')),
  ]
}

export function componentPortTarget(
  document: PageBlueprintDocument,
  nodeId: string,
  fieldId: string,
) {
  const componentId = componentIdFromNodeId(nodeId)
  const component = document.components.find((item) => item.id === componentId)
  if (component && fieldId === PAGE_BLUEPRINT_REPEAT_FIELD_ID) {
    return {
      nodeId: component.rootNodeId,
      fieldId: PAGE_BLUEPRINT_REPEAT_FIELD_ID,
    }
  }
  const port = component
    ? [...component.props, ...component.events].find((item) => item.id === fieldId)
    : null
  return port?.target ?? null
}

export function syncComponentNodeFields(document: PageBlueprintDocument): PageBlueprintDocument['nodes'] {
  return document.nodes.map((node) => {
    if (node.kind !== 'component') return node
    const componentNode = node as PageBlueprintComponentNode
    const componentId = typeof componentNode.componentId === 'string' ? componentNode.componentId : componentIdFromNodeId(node.id)
    const component = document.components.find((item) => item.id === componentId)
    if (!component) return node
    const existingById = new Map(node.fields.map((field) => [field.id, field]))
    return {
      ...node,
      label: component.name,
      fields: createComponentNodeFields(component).map((field) => ({
        ...field,
        expression: existingById.get(field.id)?.expression,
        inputConnected: existingById.get(field.id)?.inputConnected,
        outputConnected: existingById.get(field.id)?.outputConnected,
      })),
    }
  })
}

function normalizeComponentSelection(nodeIds: string[], blocks: PageBlock[]) {
  const unique = [...new Set(nodeIds)]
  if (unique.length !== 1 || !unique[0]?.startsWith('blueprint-element:')) return unique

  const rootElementId = elementIdFromNodeId(unique[0]!)
  const rootBlock = findBlockById(blocks, rootElementId)
  if (!rootBlock?.children?.length) return unique

  return flattenBlocks([rootBlock]).map((block) => elementNodeId(block.id))
}

function createComponentPorts(nodes: PageBlueprintNode[], kind: 'prop' | 'event'): PageBlueprintComponentPort[] {
  return nodes.flatMap((node) =>
    node.fields
      .filter((field) => field.direction === 'input' || field.direction === 'both')
      .filter((field) => kind === 'event' ? field.type === 'event' : field.type !== 'event')
      .map((field) => ({
        id: `${kind}:${stablePortSegment(node.id)}:${stablePortSegment(field.id)}`,
        label: `${node.label} / ${field.label}`,
        type: field.type,
        mode: field.mode,
        target: {
          nodeId: node.id,
          fieldId: field.id,
        },
      })),
  )
}

function componentPortField(port: PageBlueprintComponentPort, kind: 'prop' | 'event'): PageBlueprintField {
  return {
    id: port.id,
    label: port.label,
    type: kind === 'event' ? 'event' : port.type,
    direction: 'input',
    mode: port.mode,
    configurable: true,
    data: {
      targetNodeId: port.target.nodeId,
      targetFieldId: port.target.fieldId,
    },
  }
}

function componentRepeatField(): PageBlueprintField {
  return {
    id: PAGE_BLUEPRINT_REPEAT_FIELD_ID,
    label: 'Repeat Source',
    type: 'array',
    direction: 'input',
    mode: 'multiple',
    configurable: true,
  }
}

function componentNodeLayout(
  nodeIds: string[],
  layouts: PageBlueprintDocument['nodeLayouts'],
) {
  const selectedLayouts = nodeIds
    .map((nodeId) => layouts[nodeId])
    .filter((layout): layout is { x: number; y: number } => Boolean(layout))
  if (selectedLayouts.length === 0) return { x: 360, y: 160 }
  const maxX = Math.max(...selectedLayouts.map((layout) => layout.x))
  const minY = Math.min(...selectedLayouts.map((layout) => layout.y))
  return { x: maxX + 320, y: minY }
}

function componentNameFromRoot(rootNodeId: string, blocks: PageBlock[], fallbackIndex: number) {
  const block = findBlockById(blocks, elementIdFromNodeId(rootNodeId))
  return String(block?.props?.text ?? block?.props?.label ?? block?.elementId ?? block?.id ?? `Page Component ${fallbackIndex}`)
}

function findBlockById(blocks: PageBlock[], id: string): PageBlock | null {
  for (const block of blocks) {
    if (block.id === id) return block
    const child = findBlockById(block.children ?? [], id)
    if (child) return child
  }
  return null
}

function flattenBlocks(blocks: PageBlock[]): PageBlock[] {
  return blocks.flatMap((block) => [block, ...flattenBlocks(block.children ?? [])])
}

function elementNodeId(blockId: string) {
  return `blueprint-element:${blockId}`
}

function elementIdFromNodeId(nodeId: string) {
  return nodeId.startsWith('blueprint-element:') ? nodeId.slice('blueprint-element:'.length) : ''
}

function stablePortSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_')
}
