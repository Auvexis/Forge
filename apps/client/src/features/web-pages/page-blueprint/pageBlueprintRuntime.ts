import type {
  PageActionCollectionBinding,
  PageActionDocument,
  PageActionElementBindingTarget,
  PageActionOutputBinding,
  PageBlock,
  PageElementEvent,
} from '../types/page.types.ts'
import type { PageBlueprintDocument } from './pageBlueprintDocument.ts'
import {
  blueprintResultPathFromExpression,
  evaluateBlueprintExpression,
} from './pageBlueprintExpressions.ts'
import {
  createBlueprintDataFlowContext,
  resolveBlueprintDataPath,
  type PageBlueprintDataResolveMode,
} from './pageBlueprintDataFlow.ts'
import {
  buildPageBlockParentMap,
  collectionFieldIdFromItemFieldId,
  createRepeatBinding,
  isBlueprintItemFieldId,
  isBlueprintRepeatFieldId,
  isPageBlockDescendantOf,
  itemPathFromFieldId,
  sourceBelongsToRepeatBinding,
} from './pageBlueprintRepeaters.ts'
import type {
  PageBlueprintConnection,
  PageBlueprintField,
  PageBlueprintNode,
  PageBlueprintRepeatBinding,
} from './pageBlueprintSchema.ts'

const BLUEPRINT_EVENT_PREFIX = 'blueprint-page-event:'
const BLUEPRINT_OUTPUT_PREFIX = 'blueprint-output-binding:'
const BLUEPRINT_COLLECTION_PREFIX = 'blueprint-collection-binding:'

export function applyBlueprintRuntimeToPage(
  blocks: PageBlock[],
  pageActions: PageActionDocument | undefined,
  blueprint: PageBlueprintDocument,
): { blocks: PageBlock[]; pageActions: PageActionDocument } {
  const actions = buildBlueprintRuntimeActions(blocks, pageActions, blueprint)
  return {
    blocks: actions.blocks,
    pageActions: actions.pageActions,
  }
}

export function applyBlueprintPreviewValuesToBlocks(
  blocks: PageBlock[],
  blueprint: PageBlueprintDocument,
): PageBlock[] {
  return applyPreviewValues(
    applyPreviewRepeaters(blocks, blueprint),
    collectBlueprintElementValues(blueprint, true),
  )
}

function collectBlueprintElementValues(
  blueprint: PageBlueprintDocument,
  useTestResult: boolean,
): Map<string, Array<{ fieldId: string; value: unknown }>> {
  const previewValues = new Map<string, Array<{ fieldId: string; value: unknown }>>()
  const nodes = new Map(blueprint.nodes.map((node) => [node.id, node]))
  const dataFlow = createBlueprintDataFlowContext(blueprint)
  const resolveMode: PageBlueprintDataResolveMode = useTestResult ? 'test' : 'empty'

  for (const connection of blueprint.connections) {
    const fromNode = nodes.get(connection.from.nodeId)
    const toNode = resolveRuntimeNode(nodes, connection.to.nodeId)
    if (!fromNode || !toNode) continue
    if (fromNode.kind !== 'utility' || toNode.kind !== 'element') continue
    if (connection.from.fieldId === 'event') continue
    if (isBlueprintRepeatFieldId(connection.to.fieldId)) continue
    if (isBlueprintItemFieldId(connection.from.fieldId)) continue

    const value = evaluateBlueprintExpression(connection.expression, (path) =>
      resolveBlueprintDataPath(dataFlow, path, resolveMode),
    )
    if (value === undefined) continue

    const blockId = elementBlockId(toNode.id)
    previewValues.set(blockId, [...(previewValues.get(blockId) ?? []), { fieldId: connection.to.fieldId, value }])
  }

  return previewValues
}

function buildBlueprintRuntimeActions(
  blocks: PageBlock[],
  pageActions: PageActionDocument | undefined,
  blueprint: PageBlueprintDocument,
) {
  const blockMap = new Map<string, PageBlock>()
  visitBlocks(blocks, (block) => blockMap.set(block.id, block))

  const nodes = new Map(blueprint.nodes.map((node) => [node.id, node]))
  const repeatBindings = collectRepeatBindings(blueprint)
  const parents = buildPageBlockParentMap(blocks)
  const eventsByBlock = new Map<string, PageElementEvent[]>()
  const outputBindings: Record<string, PageActionOutputBinding[]> = stripBlueprintOutputBindings(pageActions?.outputBindings ?? {})
  const collectionBindings: Record<string, PageActionCollectionBinding[]> = stripBlueprintCollectionBindings(pageActions?.collectionBindings ?? {})

  for (const repeatBinding of repeatBindings) {
    const sourceNode = nodes.get(repeatBinding.source.nodeId)
    if (!sourceNode || sourceNode.kind !== 'utility' || sourceNode.type !== 'run-workflow') continue
    const binding = createCollectionBindingFromRepeatBinding(sourceNode, repeatBinding)
    if (!binding) continue
    collectionBindings[binding.actionId] = [...(collectionBindings[binding.actionId] ?? []), binding]
  }

  for (const connection of blueprint.connections) {
    const fromNode = nodes.get(connection.from.nodeId)
    const toNode = resolveRuntimeNode(nodes, connection.to.nodeId)
    if (!fromNode || !toNode) continue
    if (isBlueprintRepeatFieldId(connection.to.fieldId)) continue

    if (fromNode.kind === 'utility' && fromNode.type === 'run-workflow' && connection.from.fieldId === 'event' && toNode.kind === 'element') {
      const event = createElementEventFromConnection(fromNode, toNode, connection.to.fieldId)
      if (!event) continue
      const blockId = elementBlockId(toNode.id)
      eventsByBlock.set(blockId, [...(eventsByBlock.get(blockId) ?? []), event])
      continue
    }

    if (fromNode.kind === 'utility' && fromNode.type === 'run-workflow' && toNode.kind === 'element') {
      const targetBlock = blockMap.get(elementBlockId(toNode.id))
      const scopedBinding = createScopedOutputBindingFromConnection(
        fromNode,
        toNode,
        connection,
        targetBlock,
        repeatBindings,
        parents,
      )
      const binding = scopedBinding ?? (
        isBlueprintItemFieldId(connection.from.fieldId)
          ? null
          : createOutputBindingFromConnection(fromNode, toNode, connection, targetBlock)
      )
      if (!binding) continue
      outputBindings[binding.actionId] = [...(outputBindings[binding.actionId] ?? []), binding]
    }
  }

  return {
    blocks: applyBlueprintEventsToBlocks(
      applyPreviewValues(blocks, collectBlueprintElementValues(blueprint, false)),
      eventsByBlock,
    ),
    pageActions: {
      inputBindings: pageActions?.inputBindings ?? {},
      outputBindings,
      collectionBindings,
    },
  }
}

function createCollectionBindingFromRepeatBinding(
  runWorkflowNode: PageBlueprintNode,
  repeatBinding: PageBlueprintRepeatBinding,
): PageActionCollectionBinding | null {
  const workflowId = stringData(runWorkflowNode, 'workflowId')
  const triggerId = stringData(runWorkflowNode, 'triggerId')
  if (!workflowId || !triggerId) return null
  const actionId = pageActionId(workflowId, triggerId)
  return {
    id: `${BLUEPRINT_COLLECTION_PREFIX}${actionId}:${repeatBinding.collectionPath}:${repeatBinding.targetElementId}`,
    actionId,
    collectionPath: repeatBinding.collectionPath,
    targetElementId: repeatBinding.targetElementId,
    itemAlias: repeatBinding.itemAlias || 'item',
    mode: 'repeater',
    createdAt: new Date().toISOString(),
  }
}

function createElementEventFromConnection(
  runWorkflowNode: PageBlueprintNode,
  elementNode: PageBlueprintNode,
  eventFieldId: string,
): PageElementEvent | null {
  const workflowId = stringData(runWorkflowNode, 'workflowId')
  const triggerId = stringData(runWorkflowNode, 'triggerId')
  if (!workflowId || !triggerId) return null

  const eventField = elementNode.fields.find((field) => field.id === eventFieldId)
  const eventName = normalizeEventName(eventField?.value)
  if (!eventName) return null

  const actionId = pageActionId(workflowId, triggerId)
  return {
    id: `${BLUEPRINT_EVENT_PREFIX}${elementBlockId(elementNode.id)}:${actionId}:${eventName}`,
    event: eventName,
    actionId,
    workflowId,
    triggerId,
  }
}

function createOutputBindingFromConnection(
  runWorkflowNode: PageBlueprintNode,
  elementNode: PageBlueprintNode,
  connection: PageBlueprintConnection,
  targetBlock: PageBlock | undefined,
): PageActionOutputBinding | null {
  const workflowId = stringData(runWorkflowNode, 'workflowId')
  const triggerId = stringData(runWorkflowNode, 'triggerId')
  if (!workflowId || !triggerId || !targetBlock) return null

  const fromField = runWorkflowNode.fields.find((field) => field.id === connection.from.fieldId)
  const target = outputTargetForField(targetBlock, connection.to.fieldId)
  if (!fromField || !target) return null

  const resultPath = resultPathForConnection(connection, fromField, valueForBlockField(targetBlock, connection.to.fieldId))
  if (resultPath === null) return null

  const actionId = pageActionId(workflowId, triggerId)
  return {
    id: `${BLUEPRINT_OUTPUT_PREFIX}${actionId}:${resultPath}:${target.elementId}:${target.property}`,
    actionId,
    resultPath,
    expression: connection.expression,
    target,
    createdAt: new Date().toISOString(),
  }
}

function createScopedOutputBindingFromConnection(
  runWorkflowNode: PageBlueprintNode,
  elementNode: PageBlueprintNode,
  connection: PageBlueprintConnection,
  targetBlock: PageBlock | undefined,
  repeatBindings: PageBlueprintRepeatBinding[],
  parents: Map<string, string | null>,
): PageActionOutputBinding | null {
  if (!targetBlock || !isBlueprintItemFieldId(connection.from.fieldId)) return null
  const repeatBinding = repeatBindings.find((binding) =>
    sourceBelongsToRepeatBinding(
      { ...connection.from, fieldId: collectionFieldIdFromItemFieldId(connection.from.fieldId) },
      binding,
    ) && isPageBlockDescendantOf(parents, elementBlockId(elementNode.id), binding.targetElementId),
  )
  if (!repeatBinding) return null

  const workflowId = stringData(runWorkflowNode, 'workflowId')
  const triggerId = stringData(runWorkflowNode, 'triggerId')
  if (!workflowId || !triggerId) return null

  const target = outputTargetForField(targetBlock, connection.to.fieldId)
  if (!target) return null

  const actionId = pageActionId(workflowId, triggerId)
  const resultPath = itemPathFromFieldId(connection.from.fieldId, repeatBinding.itemAlias || 'item')
  return {
    id: `${BLUEPRINT_OUTPUT_PREFIX}${actionId}:${repeatBinding.id}:${resultPath}:${target.elementId}:${target.property}`,
    actionId,
    resultPath,
    expression: connection.expression,
    target,
    createdAt: new Date().toISOString(),
  }
}

function outputTargetForField(block: PageBlock, fieldId: string): PageActionElementBindingTarget | null {
  if (fieldId === 'checked') {
    return { elementId: block.id, property: 'checked', label: blockLabel(block, 'Checked') }
  }
  if (fieldId === 'value') {
    return { elementId: block.id, property: 'value', label: blockLabel(block, 'Value') }
  }
  if (fieldId === 'text' || fieldId === 'label') {
    return { elementId: block.id, property: 'text', label: blockLabel(block, 'Text') }
  }
  return null
}

function resultPathForConnection(connection: PageBlueprintConnection, fromField: PageBlueprintField, targetValue: unknown) {
  const expressionPath = blueprintResultPathFromExpression(connection.expression, connection.from.nodeId, connection.from.fieldId)
    ?? resultPathFromExpression(targetValue, connection.from.nodeId, connection.from.fieldId)
  if (expressionPath !== null) return expressionPath
  if (fromField.id === 'return') return ''
  if (fromField.id.startsWith('return:')) return fromField.id.slice('return:'.length)
  return fromField.id
}

function resultPathFromExpression(value: unknown, nodeId: string, fieldId: string) {
  const expression = typeof value === 'string' ? value.trim().match(/^\{\{\s*(.+?)\s*\}\}$/)?.[1] : undefined
  if (!expression) return null
  const prefix = `${nodeId}.${fieldId}`
  if (!expression.startsWith(prefix)) return null
  const fieldPath = fieldId.startsWith('return:') ? fieldId.slice('return:'.length) : ''
  const suffix = expression.slice(prefix.length).replace(/^[:.]/, '')
  return [fieldPath, suffix].filter(Boolean).join('.')
}

function valueForBlockField(block: PageBlock, fieldId: string) {
  if (fieldId === 'text') return block.props?.text ?? block.props?.label
  if (fieldId === 'value') return block.props?.value ?? block.attributes?.value
  if (fieldId === 'checked') return block.props?.checked ?? block.attributes?.checked
  return block.props?.[fieldId] ?? block.attributes?.[fieldId]
}

function applyBlueprintEventsToBlocks(blocks: PageBlock[], eventsByBlock: Map<string, PageElementEvent[]>): PageBlock[] {
  return blocks.map((block) => {
    const existingEvents = (block.events ?? []).filter((event) => !event.id.startsWith(BLUEPRINT_EVENT_PREFIX))
    const blueprintEvents = eventsByBlock.get(block.id) ?? []
    return {
      ...block,
      events: [...existingEvents, ...blueprintEvents],
      children: applyBlueprintEventsToBlocks(block.children ?? [], eventsByBlock),
    }
  })
}

function applyPreviewValues(blocks: PageBlock[], valuesByBlock: Map<string, Array<{ fieldId: string; value: unknown }>>): PageBlock[] {
  return blocks.map((block) => {
    const values = valuesByBlock.get(block.id) ?? []
    const nextBlock: PageBlock = {
      ...block,
      props: block.props ? { ...block.props } : undefined,
      attributes: block.attributes ? { ...block.attributes } : undefined,
      children: applyPreviewValues(block.children ?? [], valuesByBlock),
    }
    for (const item of values) applyPreviewValue(nextBlock, item.fieldId, item.value)
    return nextBlock
  })
}

function applyPreviewRepeaters(blocks: PageBlock[], blueprint: PageBlueprintDocument): PageBlock[] {
  const repeatBindings = collectRepeatBindings(blueprint)
  if (repeatBindings.length === 0) return blocks

  const nodes = new Map(blueprint.nodes.map((node) => [node.id, node]))
  const dataFlow = createBlueprintDataFlowContext(blueprint)
  const scopedConnections = blueprint.connections.filter((connection) => isBlueprintItemFieldId(connection.from.fieldId))

  const repeatBlock = (block: PageBlock): PageBlock => {
    const repeatBinding = repeatBindings.find((binding) => binding.targetElementId === block.id)
    if (!repeatBinding) {
      return {
        ...block,
        children: (block.children ?? []).map(repeatBlock),
      }
    }

    const collection = resolveBlueprintDataPath(
      dataFlow,
      `${repeatBinding.source.nodeId}.${repeatBinding.source.fieldId}`,
      'test',
    )
    if (!Array.isArray(collection)) {
      return {
        ...block,
        children: (block.children ?? []).map(repeatBlock),
      }
    }

    const children = collection.flatMap((item, index) =>
      (block.children ?? []).map((child) => clonePreviewRepeatBlock(
        child,
        index,
        item,
        repeatBinding,
        nodes,
        scopedConnections,
      )),
    )
    return { ...block, children }
  }

  return blocks.map(repeatBlock)
}

function clonePreviewRepeatBlock(
  block: PageBlock,
  index: number,
  item: unknown,
  repeatBinding: PageBlueprintRepeatBinding,
  nodes: Map<string, PageBlueprintNode>,
  scopedConnections: PageBlueprintConnection[],
): PageBlock {
  const originalBlockId = block.id
  const nextBlock: PageBlock = {
    ...block,
    id: `${block.id}__repeat_${index}`,
    children: (block.children ?? []).map((child) =>
      clonePreviewRepeatBlock(child, index, item, repeatBinding, nodes, scopedConnections),
    ),
  }

  for (const connection of scopedConnections) {
    const toNode = resolveRuntimeNode(nodes, connection.to.nodeId)
    if (!toNode || elementBlockId(toNode.id) !== originalBlockId) continue
    if (!sourceBelongsToRepeatBinding(
      { ...connection.from, fieldId: collectionFieldIdFromItemFieldId(connection.from.fieldId) },
      repeatBinding,
    )) continue
    const itemPath = itemPathFromFieldId(connection.from.fieldId, repeatBinding.itemAlias || 'item')
    const value = itemPath === 'item' ? item : resolveObjectPath(item, itemPath.replace(/^item\.?/, '').split('.').filter(Boolean))
    if (value !== undefined) applyPreviewValue(nextBlock, connection.to.fieldId, value)
  }

  return nextBlock
}

function applyPreviewValue(block: PageBlock, fieldId: string, value: unknown) {
  if (fieldId === 'class') {
    block.className = stringifyPreviewValue(value)
    return
  }
  if (fieldId === 'id') {
    block.elementId = stringifyPreviewValue(value)
    block.attributes = { ...(block.attributes ?? {}), id: stringifyPreviewValue(value) }
    return
  }
  if (fieldId === 'checked') {
    block.props = { ...(block.props ?? {}), checked: Boolean(value) }
    return
  }
  block.props = {
    ...(block.props ?? {}),
    [fieldId]: stringifyPreviewValue(value),
    ...(fieldId === 'text' ? { label: stringifyPreviewValue(value) } : {}),
  }
}

function stringifyPreviewValue(value: unknown) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
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

function stripBlueprintOutputBindings(bindings: Record<string, PageActionOutputBinding[]>) {
  const next: Record<string, PageActionOutputBinding[]> = {}
  for (const [actionId, actionBindings] of Object.entries(bindings)) {
    const filtered = actionBindings.filter((binding) => !binding.id.startsWith(BLUEPRINT_OUTPUT_PREFIX))
    if (filtered.length > 0) next[actionId] = filtered
  }
  return next
}

function stripBlueprintCollectionBindings(bindings: Record<string, PageActionCollectionBinding[]>) {
  const next: Record<string, PageActionCollectionBinding[]> = {}
  for (const [actionId, actionBindings] of Object.entries(bindings)) {
    const filtered = actionBindings.filter((binding) => !binding.id.startsWith(BLUEPRINT_COLLECTION_PREFIX))
    if (filtered.length > 0) next[actionId] = filtered
  }
  return next
}

function collectRepeatBindings(blueprint: PageBlueprintDocument): PageBlueprintRepeatBinding[] {
  const explicitBindings = blueprint.repeatBindings ?? []
  const explicitIds = new Set(explicitBindings.map((binding) => binding.id))
  const derivedBindings = blueprint.connections
    .filter((connection) => isBlueprintRepeatFieldId(connection.to.fieldId))
    .map((connection) => createRepeatBinding(connection.from, connection.to.nodeId, elementBlockId(connection.to.nodeId)))
    .filter((binding) => !explicitIds.has(binding.id))
  return [...explicitBindings, ...derivedBindings]
}

function visitBlocks(blocks: PageBlock[], visitor: (block: PageBlock) => void) {
  for (const block of blocks) {
    visitor(block)
    visitBlocks(block.children ?? [], visitor)
  }
}

function normalizeEventName(value: unknown): PageElementEvent['event'] | null {
  if (value === 'click' || value === 'change' || value === 'input' || value === 'submit') return value
  return null
}

function stringData(node: PageBlueprintNode, key: string) {
  const value = node.data?.[key]
  return typeof value === 'string' ? value : ''
}

function pageActionId(workflowId: string, triggerId: string) {
  return `page-action:${workflowId}:${triggerId}`
}

function elementBlockId(nodeId: string) {
  return nodeId.startsWith('blueprint-element:') ? nodeId.slice('blueprint-element:'.length) : nodeId
}

function resolveRuntimeNode(nodes: Map<string, PageBlueprintNode>, nodeId: string): PageBlueprintNode | null {
  const node = nodes.get(nodeId)
  if (node) return node
  if (!nodeId.startsWith('blueprint-element:')) return null
  return {
    id: nodeId,
    kind: 'element',
    type: 'page-element',
    label: elementBlockId(nodeId),
    fields: [],
    data: {},
  }
}

function blockLabel(block: PageBlock, fallback: string) {
  return String(block.props?.label ?? block.props?.text ?? block.elementId ?? block.id ?? fallback)
}
