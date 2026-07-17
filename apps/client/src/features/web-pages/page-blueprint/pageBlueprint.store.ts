import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import type { PageBlock } from '../types/page.types.ts'
import { useSitesStore } from '../stores/sites.store.ts'
import {
  createDefaultPageBlueprintDocument,
  PAGE_BLUEPRINT_DOCUMENT_PATH,
  parsePageBlueprintDocument,
  serializePageBlueprintDocument,
  type PageBlueprintDocument,
} from './pageBlueprintDocument.ts'
import {
  createUtilityNodeFromDefinition,
  getPageBlueprintNodeDefinition,
} from './pageBlueprintNodeRegistry.ts'
import { createBlueprintEventLabel } from './pageBlueprintEventLabels.ts'
import type {
  PageBlueprintConnectionEndpoint,
  PageBlueprintField,
  PageBlueprintFieldDirection,
  PageBlueprintFieldMode,
  PageBlueprintFieldType,
  PageBlueprintUtilityNodeType,
} from './pageBlueprintSchema.ts'

export const usePageBlueprintStore = defineStore('web-page-blueprint', () => {
  const document = ref<PageBlueprintDocument>(createDefaultPageBlueprintDocument())
  const savedSnapshot = ref<string>(serializeForDiff(document.value))
  const lastHistorySnapshot = ref<string>(serialize(document.value))
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])
  let suppressHistory = false

  const isDirty = computed(() => serializeForDiff(document.value) !== savedSnapshot.value)
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function loadFromActiveSite() {
    const sitesStore = useSitesStore()
    const file = sitesStore.activeSite?.files.find((item) => item.path === PAGE_BLUEPRINT_DOCUMENT_PATH && item.kind === 'file')
    const nextDocument = parsePageBlueprintDocument(file?.content)
    const snapshot = serializeForDiff(nextDocument)

    suppressHistory = true
    document.value = nextDocument
    savedSnapshot.value = snapshot
    lastHistorySnapshot.value = snapshot
    undoStack.value = []
    redoStack.value = []
    suppressHistory = false
  }

  function saveToActiveSite() {
    const sitesStore = useSitesStore()
    if (!sitesStore.activeSite) return false
    const existingFile = sitesStore.activeSite.files.find((item) => item.path === PAGE_BLUEPRINT_DOCUMENT_PATH && item.kind === 'file')
    if (existingFile && !isDirty.value) return true

    const nextDocument = touchDocument(document.value)
    const content = serializePageBlueprintDocument(nextDocument)
    const updated = sitesStore.updateFile(PAGE_BLUEPRINT_DOCUMENT_PATH, content)
    if (!updated) sitesStore.createFile(PAGE_BLUEPRINT_DOCUMENT_PATH, content)

    suppressHistory = true
    document.value = nextDocument
    const snapshot = serializeForDiff(nextDocument)
    savedSnapshot.value = snapshot
    lastHistorySnapshot.value = snapshot
    suppressHistory = false
    return true
  }

  function setViewport(viewport: BaseCanvasViewport) {
    if (serializeViewport(document.value.viewport) === serializeViewport(viewport)) return
    suppressHistory = true
    document.value = {
      ...document.value,
      viewport,
    }
    suppressHistory = false
  }

  function syncPageElementNodes(blocks: PageBlock[]) {
    const pageBlocks = flattenPageBlocks(blocks)
    if (pageBlocks.length === 0) return false

    const blocksByNodeId = new Map(pageBlocks.map((block) => [elementNodeIdFromBlockId(block.id), block]))
    const existingNodeIds = new Set(document.value.nodes.map((node) => node.id))
    const nextNodes = document.value.nodes.map((node) => {
      const block = blocksByNodeId.get(node.id)
      if (node.kind !== 'element' || !block) return node
      return syncElementNode(node, block)
    })

    for (const block of pageBlocks) {
      const nodeId = elementNodeIdFromBlockId(block.id)
      if (existingNodeIds.has(nodeId)) continue
      nextNodes.push(createElementNodeFromBlock(block))
    }

    if (JSON.stringify(nextNodes) === JSON.stringify(document.value.nodes)) return false
    patchDerivedDocument({ nodes: nextNodes })
    return true
  }

  function setNodePosition(nodeId: string, position: { x: number; y: number }) {
    patchDocument({
      nodeLayouts: {
        ...document.value.nodeLayouts,
        [nodeId]: position,
      },
    })
  }

  function setNodePositions(positions: Record<string, { x: number; y: number }>) {
    patchDocument({
      nodeLayouts: {
        ...document.value.nodeLayouts,
        ...positions,
      },
    })
  }

  function setCollapsedGroups(groupIds: string[]) {
    patchDocument({ collapsedGroups: groupIds })
  }

  function connectFields(from: PageBlueprintConnectionEndpoint, to: PageBlueprintConnectionEndpoint) {
    if (from.nodeId === to.nodeId && from.fieldId === to.fieldId) return null

    const expression = createConnectionExpression(from)
    const connection = {
      id: createConnectionId(from, to),
      from,
      to,
      expression,
    }

    patchDocument({
      connections: [
        ...document.value.connections.filter((item) => !(item.to.nodeId === to.nodeId && item.to.fieldId === to.fieldId)),
        connection,
      ],
      nodes: patchNodeField(document.value.nodes, to.nodeId, to.fieldId, { expression }),
    })

    return connection.id
  }

  function removeConnection(connectionId: string) {
    const connection = document.value.connections.find((item) => item.id === connectionId)
    if (!connection) return

    patchDocument({
      connections: document.value.connections.filter((item) => item.id !== connectionId),
      nodes: patchNodeField(document.value.nodes, connection.to.nodeId, connection.to.fieldId, { expression: undefined }),
    })
  }

  function removeInputConnection(nodeId: string, fieldId: string) {
    const connection = document.value.connections.find((item) => item.to.nodeId === nodeId && item.to.fieldId === fieldId)
    if (!connection) return
    removeConnection(connection.id)
  }

  function setInputConnectionExpression(nodeId: string, fieldId: string, expression: string) {
    const connection = document.value.connections.find((item) => item.to.nodeId === nodeId && item.to.fieldId === fieldId)
    if (!connection) return false

    patchDocument({
      connections: document.value.connections.map((item) =>
        item.id === connection.id ? { ...item, expression } : item,
      ),
      nodes: patchNodeField(document.value.nodes, nodeId, fieldId, { expression }),
    })

    return true
  }

  function setNodeFieldMode(nodeId: string, fieldId: string, mode: PageBlueprintFieldMode) {
    patchDocument({
      nodes: patchNodeField(document.value.nodes, nodeId, fieldId, { mode }),
    })
  }

  function setNodeLabel(nodeId: string, label: string) {
    patchDocument({
      nodes: document.value.nodes.map((node) => (node.id === nodeId ? { ...node, label } : node)),
    })
  }

  function renameNodeId(nodeId: string, nextNodeId: string) {
    const normalized = nextNodeId.trim()
    if (!normalized || normalized === nodeId) return false
    if (document.value.nodes.some((node) => node.id === normalized)) return false

    const nodeLayouts = { ...document.value.nodeLayouts }
    if (nodeLayouts[nodeId]) {
      nodeLayouts[normalized] = nodeLayouts[nodeId]
      delete nodeLayouts[nodeId]
    }

    patchDocument({
      nodes: document.value.nodes.map((node) => ({
        ...(node.id === nodeId ? { ...node, id: normalized } : node),
        fields: node.fields.map((field) => ({
          ...field,
          expression: field.expression?.replaceAll(`{{ ${nodeId}.`, `{{ ${normalized}.`),
        })),
      })),
      nodeLayouts,
      connections: document.value.connections.map((connection) => ({
        ...connection,
        id: createConnectionId(renameEndpointNode(connection.from, nodeId, normalized), renameEndpointNode(connection.to, nodeId, normalized)),
        from: renameEndpointNode(connection.from, nodeId, normalized),
        to: renameEndpointNode(connection.to, nodeId, normalized),
        expression: connection.from.nodeId === nodeId
          ? createConnectionExpression(renameEndpointNode(connection.from, nodeId, normalized))
          : connection.expression,
      })),
    })

    return true
  }

  function setNodeFieldValue(nodeId: string, fieldId: string, value: string) {
    patchDocument({
      nodes: patchNodeField(document.value.nodes, nodeId, fieldId, { value, expression: undefined }),
      connections: document.value.connections.filter((connection) =>
        !(connection.to.nodeId === nodeId && connection.to.fieldId === fieldId),
      ),
    })
  }

  function configureRunWorkflowNode(
    nodeId: string,
    config: { workflowId: string; triggerId: string; actionId?: string; label: string; detail: string },
  ) {
    const sourceNode = document.value.nodes.find((node) => node.id === nodeId)
    const previousTriggerId = typeof sourceNode?.data?.triggerId === 'string' ? sourceNode.data.triggerId : ''
    const triggerChanged = previousTriggerId !== config.triggerId
    const removedConnections = triggerChanged
      ? document.value.connections.filter((connection) =>
        (connection.from.nodeId === nodeId && connection.from.fieldId !== 'event') || connection.to.nodeId === nodeId,
      )
      : []

    patchDocument({
      nodes: clearConnectionExpressions(
        document.value.nodes.map((node) => {
          if (node.id !== nodeId) return node
          const data = node.data ?? {}
          return {
            ...node,
            label: config.label,
            fields: triggerChanged ? [createRunWorkflowEventField()] : ensureRunWorkflowEventField(node.fields),
            data: {
              ...data,
              workflowId: config.workflowId,
              triggerId: config.triggerId,
              actionId: config.actionId,
              detail: config.detail,
              input: triggerChanged ? {} : (isRecord(data.input) ? data.input : {}),
              testResultJson: triggerChanged ? undefined : data.testResultJson,
            },
          }
        }),
        removedConnections.map((connection) => connection.to),
      ),
      connections: triggerChanged
        ? document.value.connections.filter((connection) =>
          !(connection.from.nodeId === nodeId && connection.from.fieldId !== 'event') && connection.to.nodeId !== nodeId,
        )
        : document.value.connections,
    })
  }

  function setRunWorkflowEventType(nodeId: string, eventType: string) {
    patchDocument({
      nodes: document.value.nodes.map((node) =>
        node.id === nodeId
          ? {
            ...node,
            fields: patchFields(node.fields, 'event', {
              label: createBlueprintEventLabel(eventType),
              value: eventType,
            }),
            data: { ...(node.data ?? {}), eventType },
          }
          : node,
      ),
    })
  }

  function setRunWorkflowInput(nodeId: string, key: string, value: unknown) {
    patchDocument({
      nodes: document.value.nodes.map((node) => {
        if (node.id !== nodeId) return node
        const data = node.data ?? {}
        const input = isRecord(data.input) ? data.input : {}
        return {
          ...node,
          data: {
            ...data,
            input: {
              ...input,
              [key]: value,
            },
          },
        }
      }),
    })
  }

  function addNodeField(
    nodeId: string,
    field: {
      label?: string
      type?: PageBlueprintFieldType
      direction?: PageBlueprintFieldDirection
      mode?: PageBlueprintFieldMode
      value?: string
    } = {},
  ) {
    const sourceNode = document.value.nodes.find((node) => node.id === nodeId)
    if (!sourceNode) return null

    const nextField: PageBlueprintField = {
      id: `field:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`,
      label: field.label?.trim() || `Field ${sourceNode.fields.length + 1}`,
      type: field.type ?? 'string',
      direction: field.direction ?? 'output',
      mode: field.mode ?? 'single',
      value: field.value,
      configurable: true,
    }

    patchDocument({
      nodes: document.value.nodes.map((node) =>
        node.id === nodeId ? { ...node, fields: [...node.fields, nextField] } : node,
      ),
    })

    return nextField.id
  }

  function removeNodeField(nodeId: string, fieldId: string) {
    const removedConnections = document.value.connections.filter((connection) =>
      (connection.from.nodeId === nodeId && connection.from.fieldId === fieldId)
        || (connection.to.nodeId === nodeId && connection.to.fieldId === fieldId),
    )

    patchDocument({
      nodes: clearConnectionExpressions(
        document.value.nodes.map((node) =>
          node.id === nodeId ? { ...node, fields: node.fields.filter((field) => field.id !== fieldId) } : node,
        ),
        removedConnections.map((connection) => connection.to),
      ),
      connections: document.value.connections.filter((connection) =>
        !((connection.from.nodeId === nodeId && connection.from.fieldId === fieldId)
          || (connection.to.nodeId === nodeId && connection.to.fieldId === fieldId)),
      ),
    })
  }

  function applyRunWorkflowTestResult(nodeId: string, result: unknown) {
    const nextFields = [createRunWorkflowEventField(), ...createReturnFieldsFromResult(result)]
    const removedConnections = document.value.connections.filter((connection) =>
      (connection.from.nodeId === nodeId && connection.from.fieldId !== 'event')
        || (connection.to.nodeId === nodeId && connection.to.fieldId !== 'event'),
    )

    patchDocument({
      nodes: clearConnectionExpressions(
        document.value.nodes.map((node) =>
          node.id === nodeId
            ? {
              ...node,
              fields: nextFields,
              data: {
                ...(node.data ?? {}),
                testResultJson: JSON.stringify(result, null, 2),
              },
            }
            : node,
        ),
        removedConnections.map((connection) => connection.to),
      ),
      connections: document.value.connections.filter((connection) =>
        !(connection.from.nodeId === nodeId && connection.from.fieldId !== 'event')
          && !(connection.to.nodeId === nodeId && connection.to.fieldId !== 'event'),
      ),
    })

    return true
  }

  function addUtilityNode(type: PageBlueprintUtilityNodeType, position?: { x: number; y: number }) {
    const definition = getPageBlueprintNodeDefinition(type)
    if (!definition) return null

    const node = createUtilityNodeFromDefinition(definition)
    const fallbackPosition = {
      x: Math.round((-document.value.viewport.x + 320) / document.value.viewport.zoom),
      y: Math.round((-document.value.viewport.y + 120) / document.value.viewport.zoom),
    }

    patchDocument({
      nodes: [...document.value.nodes, node],
      nodeLayouts: {
        ...document.value.nodeLayouts,
        [node.id]: position ?? fallbackPosition,
      },
    })

    return node.id
  }

  function addElementEventField(nodeId: string, eventType = 'click') {
    const existingNode = document.value.nodes.find((node) => node.id === nodeId)
    const nextField: PageBlueprintField = {
      id: `event:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`,
      label: elementEventLabel(eventType),
      type: 'event',
      direction: 'input',
      value: eventType,
      configurable: false,
    }

    if (existingNode) {
      patchDocument({
        nodes: document.value.nodes.map((node) =>
          node.id === nodeId ? { ...node, fields: [...node.fields, nextField] } : node,
        ),
      })
      return nextField.id
    }

    patchDocument({
      nodes: [
        ...document.value.nodes,
        {
          id: nodeId,
          kind: 'element',
          type: 'page-element',
          label: elementLabelFromNodeId(nodeId),
          fields: [nextField],
          data: {},
        },
      ],
    })

    return nextField.id
  }

  function setElementEventType(nodeId: string, fieldId: string, eventType: string) {
    patchDocument({
      nodes: patchNodeField(document.value.nodes, nodeId, fieldId, {
        label: elementEventLabel(eventType),
        type: 'event',
        direction: 'input',
        value: eventType,
      }),
    })
  }

  function duplicateNode(nodeId: string) {
    const source = document.value.nodes.find((node) => node.id === nodeId)
    if (!source) return null

    const nextNode = cloneBlueprintNode(source)
    const sourceLayout = document.value.nodeLayouts[nodeId]
    const nextLayout = sourceLayout
      ? { x: sourceLayout.x + 32, y: sourceLayout.y + 32 }
      : {
        x: Math.round((-document.value.viewport.x + 360) / document.value.viewport.zoom),
        y: Math.round((-document.value.viewport.y + 160) / document.value.viewport.zoom),
      }

    patchDocument({
      nodes: [...document.value.nodes, nextNode],
      nodeLayouts: {
        ...document.value.nodeLayouts,
        [nextNode.id]: nextLayout,
      },
    })

    return nextNode.id
  }

  function deleteNode(nodeId: string) {
    if (!document.value.nodes.some((node) => node.id === nodeId)) return
    const nodeLayouts = { ...document.value.nodeLayouts }
    delete nodeLayouts[nodeId]
    const removedConnections = document.value.connections.filter((connection) =>
      connection.from.nodeId === nodeId || connection.to.nodeId === nodeId,
    )

    patchDocument({
      nodes: clearConnectionExpressions(
        document.value.nodes.filter((node) => node.id !== nodeId),
        removedConnections.map((connection) => connection.to),
      ),
      nodeLayouts,
      connections: document.value.connections.filter((connection) =>
        connection.from.nodeId !== nodeId && connection.to.nodeId !== nodeId,
      ),
    })
  }

  function removeNode(nodeId: string) {
    deleteNode(nodeId)
  }

  function undo() {
    if (undoStack.value.length === 0) return
    redoStack.value.push(serialize(document.value))
    applySnapshot(undoStack.value.pop()!)
  }

  function redo() {
    if (redoStack.value.length === 0) return
    undoStack.value.push(serialize(document.value))
    applySnapshot(redoStack.value.pop()!)
  }

  function patchDocument(patch: Partial<PageBlueprintDocument>) {
    const nextDocument = {
      ...document.value,
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    if (serialize(nextDocument) === serialize(document.value)) return
    recordHistory()
    document.value = nextDocument
    lastHistorySnapshot.value = serialize(nextDocument)
  }

  function patchDerivedDocument(patch: Partial<PageBlueprintDocument>) {
    const nextDocument = {
      ...document.value,
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    if (serialize(nextDocument) === serialize(document.value)) return
    suppressHistory = true
    document.value = nextDocument
    lastHistorySnapshot.value = serialize(nextDocument)
    suppressHistory = false
  }

  function recordHistory() {
    if (suppressHistory) return
    const currentSnapshot = serialize(document.value)
    undoStack.value.push(currentSnapshot)
    if (undoStack.value.length > 50) undoStack.value.shift()
    redoStack.value = []
  }

  function applySnapshot(snapshot: string) {
    suppressHistory = true
    document.value = JSON.parse(snapshot) as PageBlueprintDocument
    lastHistorySnapshot.value = snapshot
    suppressHistory = false
  }

  return {
    document,
    isDirty,
    canUndo,
    canRedo,
    loadFromActiveSite,
    saveToActiveSite,
    setViewport,
    syncPageElementNodes,
    setNodePosition,
    setNodePositions,
    setCollapsedGroups,
    connectFields,
    removeConnection,
    removeInputConnection,
    setInputConnectionExpression,
    setNodeFieldMode,
    setNodeLabel,
    renameNodeId,
    setNodeFieldValue,
    configureRunWorkflowNode,
    setRunWorkflowEventType,
    setRunWorkflowInput,
    addNodeField,
    removeNodeField,
    applyRunWorkflowTestResult,
    addUtilityNode,
    addElementEventField,
    setElementEventType,
    duplicateNode,
    deleteNode,
    removeNode,
    undo,
    redo,
  }
})

function cloneBlueprintNode(source: PageBlueprintDocument['nodes'][number]): PageBlueprintDocument['nodes'][number] {
  return {
    ...source,
    id: `${source.id}:copy:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`,
    label: `${source.label} Copy`,
    fields: source.fields.map((field) => ({
      ...field,
      expression: undefined,
    })),
    data: source.data ? { ...source.data } : source.data,
  }
}

function createElementNodeFromBlock(block: PageBlock): PageBlueprintDocument['nodes'][number] {
  return {
    id: elementNodeIdFromBlockId(block.id),
    kind: 'element',
    type: 'page-element',
    label: blockLabelFromBlock(block),
    fields: createElementFieldsFromBlock(block),
    data: {
      elementId: block.id,
      tag: block.tag,
    },
  }
}

function syncElementNode(
  node: PageBlueprintDocument['nodes'][number],
  block: PageBlock,
): PageBlueprintDocument['nodes'][number] {
  return {
    ...node,
    kind: 'element',
    type: 'page-element',
    label: blockLabelFromBlock(block),
    fields: mergeElementFields(node.fields, createElementFieldsFromBlock(block)),
    data: {
      ...(node.data ?? {}),
      elementId: block.id,
      tag: block.tag,
    },
  }
}

function mergeElementFields(existingFields: PageBlueprintField[], baseFields: PageBlueprintField[]) {
  const baseIds = new Set(baseFields.map((field) => field.id))
  const existingById = new Map(existingFields.map((field) => [field.id, field]))
  const eventFields = existingFields.filter((field) => isElementEventField(field))
  const customFields = existingFields.filter((field) => !baseIds.has(field.id) && !isElementEventField(field))

  return [
    ...eventFields,
    ...baseFields.map((field) => ({
      ...field,
      expression: existingById.get(field.id)?.expression,
      mode: existingById.get(field.id)?.mode ?? field.mode,
    })),
    ...customFields,
  ]
}

function createElementFieldsFromBlock(block: PageBlock): PageBlueprintField[] {
  if (block.tag === 'input') {
    const type = String(block.props?.type ?? block.attributes?.type ?? 'text')
    return [
      htmlElementField('value', 'Value', 'string', block.props?.value ?? block.attributes?.value),
      ...(type === 'checkbox' ? [htmlElementField('checked', 'Checked', 'boolean', block.props?.checked ?? block.attributes?.checked)] : []),
      htmlElementField('placeholder', 'Placeholder', 'string', block.props?.placeholder ?? block.attributes?.placeholder),
      htmlElementField('type', 'Type', 'string', type),
    ]
  }

  if (block.tag === 'text' || block.tag === 'button' || block.tag === 'link') {
    return [
      htmlElementField('text', 'Text', 'string', block.props?.text ?? block.props?.label),
      ...(block.tag === 'link' ? [htmlElementField('href', 'Href', 'string', block.props?.href ?? block.attributes?.href)] : []),
    ]
  }

  if (block.tag === 'image') {
    return [
      htmlElementField('src', 'Source', 'string', block.props?.src ?? block.attributes?.src),
      htmlElementField('alt', 'Alt', 'string', block.props?.alt ?? block.attributes?.alt),
    ]
  }

  if (block.tag === 'video' || block.tag === 'audio' || block.tag === 'youtube') {
    return [
      htmlElementField('src', 'Source', 'string', block.props?.src ?? block.attributes?.src),
      htmlElementField('title', 'Title', 'string', block.props?.title ?? block.attributes?.title),
    ]
  }

  return [
    htmlElementField('id', 'Element ID', 'string', block.elementId ?? block.attributes?.id),
    htmlElementField('class', 'Class', 'string', block.className ?? block.attributes?.class),
  ]
}

function htmlElementField(
  id: string,
  label: string,
  type: PageBlueprintFieldType,
  value: unknown,
): PageBlueprintField {
  return {
    id,
    label,
    type,
    direction: 'input',
    value: stringifyElementFieldValue(value),
    configurable: false,
  }
}

function isElementEventField(field: PageBlueprintField) {
  return field.type === 'event' || field.id.startsWith('event:')
}

function flattenPageBlocks(blocks: PageBlock[]): PageBlock[] {
  return blocks.flatMap((block) => [block, ...flattenPageBlocks(block.children ?? [])])
}

function elementNodeIdFromBlockId(blockId: string) {
  return `blueprint-element:${blockId}`
}

function blockLabelFromBlock(block: PageBlock) {
  return String(block.props?.text ?? block.props?.label ?? block.elementId ?? block.id)
}

function stringifyElementFieldValue(value: unknown) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function createConnectionId(from: PageBlueprintConnectionEndpoint, to: PageBlueprintConnectionEndpoint) {
  return `connection:${from.nodeId}:${from.fieldId}->${to.nodeId}:${to.fieldId}`
}

function createConnectionExpression(from: PageBlueprintConnectionEndpoint) {
  return `{{ ${from.nodeId}.${from.fieldId} }}`
}

function renameEndpointNode(
  endpoint: PageBlueprintConnectionEndpoint,
  previousNodeId: string,
  nextNodeId: string,
): PageBlueprintConnectionEndpoint {
  return endpoint.nodeId === previousNodeId ? { ...endpoint, nodeId: nextNodeId } : endpoint
}

function createRunWorkflowEventField(): PageBlueprintField {
  return {
    id: 'event',
    label: createBlueprintEventLabel(),
    type: 'event',
    direction: 'output',
    value: 'click',
    configurable: false,
  }
}

function ensureRunWorkflowEventField(fields: PageBlueprintField[]) {
  const existingEvent = fields.find((field) => field.id === 'event')
  const restFields = fields.filter((field) => field.id !== 'event')
  return [
    existingEvent
      ? {
        ...createRunWorkflowEventField(),
        ...existingEvent,
        label: createBlueprintEventLabel(existingEvent.value),
        value: existingEvent.value ?? 'click',
      }
      : createRunWorkflowEventField(),
    ...restFields,
  ]
}

function patchNodeField(
  nodes: PageBlueprintDocument['nodes'],
  nodeId: string,
  fieldId: string,
  patch: Partial<PageBlueprintDocument['nodes'][number]['fields'][number]>,
) {
  return nodes.map((node) => {
    if (node.id !== nodeId) return node
    return {
      ...node,
      fields: node.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
    }
  })
}

function patchFields(
  fields: PageBlueprintField[],
  fieldId: string,
  patch: Partial<PageBlueprintField>,
) {
  return fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field))
}

function clearConnectionExpressions(
  nodes: PageBlueprintDocument['nodes'],
  endpoints: PageBlueprintConnectionEndpoint[],
) {
  return endpoints.reduce(
    (nextNodes, endpoint) => patchNodeField(nextNodes, endpoint.nodeId, endpoint.fieldId, { expression: undefined }),
    nodes,
  )
}

function createReturnFieldsFromResult(result: unknown): PageBlueprintField[] {
  const isMultiple = Array.isArray(result)
  const sample = isMultiple ? result[0] : result

  if (isRecord(sample)) {
    return Object.entries(sample).map(([key, value]) => ({
      id: `return:${key}`,
      label: formatFieldLabel(key),
      type: inferFieldType(value),
      direction: 'output',
      mode: isMultiple ? 'multiple' : inferFieldMode(value),
      configurable: false,
    }))
  }

  return [{
    id: 'return',
    label: 'Return',
    type: inferFieldType(result),
    direction: 'output',
    mode: isMultiple ? 'multiple' : 'single',
    configurable: false,
  }]
}

function inferFieldType(value: unknown): PageBlueprintFieldType {
  if (Array.isArray(value)) return 'array'
  if (value === null || value === undefined) return 'unknown'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'object') return 'object'
  return 'unknown'
}

function inferFieldMode(value: unknown): PageBlueprintFieldMode {
  return Array.isArray(value) ? 'multiple' : 'single'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function formatFieldLabel(key: string) {
  const normalized = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : key
}

function elementIdFromNodeId(nodeId: string) {
  return nodeId.startsWith('blueprint-element:') ? nodeId.slice('blueprint-element:'.length) : nodeId
}

function elementLabelFromNodeId(nodeId: string) {
  const elementId = elementIdFromNodeId(nodeId)
  return elementId || 'Page Element'
}

function elementEventLabel(eventType: string) {
  return createBlueprintEventLabel(eventType)
}

function touchDocument(document: PageBlueprintDocument): PageBlueprintDocument {
  return {
    ...document,
    updatedAt: new Date().toISOString(),
  }
}

function serialize(document: PageBlueprintDocument) {
  return JSON.stringify(document)
}

function serializeForDiff(document: PageBlueprintDocument) {
  return JSON.stringify({
    schemaVersion: document.schemaVersion,
    nodeLayouts: document.nodeLayouts,
    nodes: document.nodes,
    connections: document.connections,
    collapsedGroups: document.collapsedGroups,
  })
}

function serializeViewport(viewport: BaseCanvasViewport) {
  return JSON.stringify(viewport)
}
