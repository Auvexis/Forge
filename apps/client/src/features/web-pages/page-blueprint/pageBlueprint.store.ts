import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
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
import type {
  PageBlueprintConnectionEndpoint,
  PageBlueprintFieldMode,
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

  function setNodeFieldValue(nodeId: string, fieldId: string, value: string) {
    patchDocument({
      nodes: patchNodeField(document.value.nodes, nodeId, fieldId, { value, expression: undefined }),
      connections: document.value.connections.filter((connection) =>
        !(connection.to.nodeId === nodeId && connection.to.fieldId === fieldId),
      ),
    })
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
    setNodePosition,
    setNodePositions,
    setCollapsedGroups,
    connectFields,
    removeConnection,
    removeInputConnection,
    setNodeFieldMode,
    setNodeLabel,
    setNodeFieldValue,
    addUtilityNode,
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

function createConnectionId(from: PageBlueprintConnectionEndpoint, to: PageBlueprintConnectionEndpoint) {
  return `connection:${from.nodeId}:${from.fieldId}->${to.nodeId}:${to.fieldId}`
}

function createConnectionExpression(from: PageBlueprintConnectionEndpoint) {
  return `{{ ${from.nodeId}.${from.fieldId} }}`
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

function clearConnectionExpressions(
  nodes: PageBlueprintDocument['nodes'],
  endpoints: PageBlueprintConnectionEndpoint[],
) {
  return endpoints.reduce(
    (nextNodes, endpoint) => patchNodeField(nextNodes, endpoint.nodeId, endpoint.fieldId, { expression: undefined }),
    nodes,
  )
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
