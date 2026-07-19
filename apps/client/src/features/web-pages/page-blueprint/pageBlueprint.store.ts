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
  componentIdFromNodeId,
  componentNodeId,
  componentPortTarget,
  PAGE_BLUEPRINT_COMPONENT_REPEAT_OUTPUT_FIELD_ID,
  createComponentNodeFields,
  createPageComponentFromNodeSelection,
  syncComponentNodeFields,
} from './pageBlueprintComponents.ts'
import {
  createUtilityNodeFromDefinition,
  getPageBlueprintNodeDefinition,
} from './pageBlueprintNodeRegistry.ts'
import { createBlueprintEventLabel } from './pageBlueprintEventLabels.ts'
import { createBlueprintReturnFieldsFromResult } from './pageBlueprintDataFlow.ts'
import {
  createRepeatBinding,
  isBlueprintRepeatFieldId,
  isBlueprintRepeatSourceField,
  isPageBlockContainer,
  PAGE_BLUEPRINT_REPEAT_FIELD_ID,
  repeatBindingId,
} from './pageBlueprintRepeaters.ts'
import type {
  PageBlueprintConnectionEndpoint,
  PageBlueprintField,
  PageBlueprintFieldDirection,
  PageBlueprintFieldMode,
  PageBlueprintFieldType,
  PageBlueprintComponentNode,
  PageBlueprintGroup,
  PageBlueprintUtilityNodeType,
} from './pageBlueprintSchema.ts'

export const usePageBlueprintStore = defineStore('web-page-blueprint', () => {
  const document = ref<PageBlueprintDocument>(createDefaultPageBlueprintDocument())
  const savedSnapshot = ref<string>(serializeForDiff(document.value))
  const lastHistorySnapshot = ref<string>(serialize(document.value))
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])
  let suppressHistory = false
  let historyBatchSnapshot: string | null = null

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
    const blocksByNodeId = new Map(pageBlocks.map((block) => [elementNodeIdFromBlockId(block.id), block]))
    const liveElementNodeIds = new Set(blocksByNodeId.keys())
    const retainedNodes = document.value.nodes.filter((node) =>
      node.kind !== 'element' || liveElementNodeIds.has(node.id),
    )
    const nextNodes = retainedNodes.map((node) => {
      const block = blocksByNodeId.get(node.id)
      if (node.kind !== 'element' || !block) return node
      return syncElementNode(node, block)
    })

    const nextComponents = cleanupComponents(document.value.components, new Set(nextNodes.map((node) => node.id)))
    const nextGroups = cleanupGroups(document.value.groups, new Set(nextNodes.map((node) => node.id)))
    const componentNodeIds = new Set(nextComponents.map((component) => componentNodeId(component.id)))
    const syncedNodes = syncComponentNodeFields({
      ...document.value,
      components: nextComponents,
      nodes: nextNodes.filter((node) => node.kind !== 'component' || componentNodeIds.has(node.id)),
    })
    const validNodeIds = new Set(syncedNodes.map((node) => node.id))
    const validFieldIds = new Map(syncedNodes.map((node) => [node.id, new Set(node.fields.map((field) => field.id))]))
    const nextConnections = document.value.connections.filter((connection) =>
      endpointExists(connection.from, validNodeIds, validFieldIds)
        && endpointExists(connection.to, validNodeIds, validFieldIds),
    )
    const nextRepeatBindings = document.value.repeatBindings.filter((binding) =>
      endpointExists(binding.source, validNodeIds, validFieldIds) && validNodeIds.has(binding.targetNodeId),
    )
    const nextNodeLayouts = Object.fromEntries(
      Object.entries(document.value.nodeLayouts).filter(([nodeId]) => validNodeIds.has(nodeId)),
    )

    const nextPatch = {
      nodes: syncedNodes,
      components: nextComponents,
      groups: nextGroups,
      connections: nextConnections,
      repeatBindings: nextRepeatBindings,
      nodeLayouts: nextNodeLayouts,
    }
    if (JSON.stringify(nextPatch) === JSON.stringify({
      nodes: document.value.nodes,
      components: document.value.components,
      groups: document.value.groups,
      connections: document.value.connections,
      repeatBindings: document.value.repeatBindings,
      nodeLayouts: document.value.nodeLayouts,
    })) return false

    patchDerivedDocument(nextPatch)
    return true
  }

  function setNodePosition(nodeId: string, position: { x: number; y: number }, options: { history?: boolean } = {}) {
    patchNodeLayout({
      nodeLayouts: {
        ...document.value.nodeLayouts,
        [nodeId]: position,
      },
    }, options)
  }

  function setNodePositions(positions: Record<string, { x: number; y: number }>, options: { history?: boolean } = {}) {
    patchNodeLayout({
      nodeLayouts: {
        ...document.value.nodeLayouts,
        ...positions,
      },
    }, options)
  }

  function setCollapsedGroups(groupIds: string[]) {
    patchDocument({ collapsedGroups: groupIds })
  }

  function createRepeatBindingForConnection(
    from: PageBlueprintConnectionEndpoint,
    to: PageBlueprintConnectionEndpoint,
  ) {
    if (!isBlueprintRepeatFieldId(to.fieldId)) return null
    if (to.nodeId.startsWith('blueprint-component:')) return null
    const repeatSource = resolveRepeatSourceEndpoint(from)
    if (!repeatSource) return null
    const sourceField = document.value.nodes
      .find((node) => node.id === repeatSource.nodeId)
      ?.fields.find((field) => field.id === repeatSource.fieldId)
    if (!isBlueprintRepeatSourceField(sourceField)) return null
    return createRepeatBinding(repeatSource, to.nodeId, elementIdFromNodeId(to.nodeId))
  }

  function resolveRepeatSourceEndpoint(from: PageBlueprintConnectionEndpoint): PageBlueprintConnectionEndpoint | null {
    if (from.fieldId !== PAGE_BLUEPRINT_COMPONENT_REPEAT_OUTPUT_FIELD_ID) return from
    const sourceConnection = document.value.connections.find((connection) =>
      connection.to.nodeId === from.nodeId && connection.to.fieldId === PAGE_BLUEPRINT_REPEAT_FIELD_ID,
    )
    return sourceConnection?.from ?? null
  }

  function connectFields(from: PageBlueprintConnectionEndpoint, to: PageBlueprintConnectionEndpoint) {
    if (from.nodeId === to.nodeId && from.fieldId === to.fieldId) return null

    const expression = createConnectionExpression(from)
    const resolvedTo = resolveComponentPortEndpoint(to)
    const repeatBinding = createRepeatBindingForConnection(from, resolvedTo)
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
      repeatBindings: repeatBinding
        ? [
          ...document.value.repeatBindings.filter((item) => item.targetNodeId !== resolvedTo.nodeId),
          repeatBinding,
        ]
        : isBlueprintRepeatFieldId(resolvedTo.fieldId)
          ? document.value.repeatBindings.filter((item) => item.targetNodeId !== resolvedTo.nodeId)
          : updateRepeatBindingsForComponentSource(document.value.repeatBindings, to, from),
      nodes: patchConnectedTargetField(
        patchNodeField(document.value.nodes, to.nodeId, to.fieldId, { expression }),
        to,
        { expression },
      ),
    })

    return connection.id
  }

  function updateRepeatBindingsForComponentSource(
    repeatBindings: PageBlueprintDocument['repeatBindings'],
    to: PageBlueprintConnectionEndpoint,
    from: PageBlueprintConnectionEndpoint,
  ) {
    if (!to.nodeId.startsWith('blueprint-component:') || to.fieldId !== PAGE_BLUEPRINT_REPEAT_FIELD_ID) return repeatBindings
    const sourceField = document.value.nodes
      .find((node) => node.id === from.nodeId)
      ?.fields.find((field) => field.id === from.fieldId)
    if (!isBlueprintRepeatSourceField(sourceField)) return repeatBindings

    const componentRepeatConnections = document.value.connections.filter((connection) =>
      connection.from.nodeId === to.nodeId
        && connection.from.fieldId === PAGE_BLUEPRINT_COMPONENT_REPEAT_OUTPUT_FIELD_ID
        && isBlueprintRepeatFieldId(resolveComponentPortEndpoint(connection.to).fieldId),
    )
    if (componentRepeatConnections.length === 0) return repeatBindings

    const nextBindings = repeatBindings.filter((binding) =>
      !componentRepeatConnections.some((connection) => binding.targetNodeId === resolveComponentPortEndpoint(connection.to).nodeId),
    )
    for (const connection of componentRepeatConnections) {
      const target = resolveComponentPortEndpoint(connection.to)
      const targetElementId = elementIdFromNodeId(target.nodeId)
      if (!targetElementId) continue
      nextBindings.push(createRepeatBinding(from, target.nodeId, targetElementId))
    }
    return nextBindings
  }

  function removeConnection(connectionId: string) {
    const connection = document.value.connections.find((item) => item.id === connectionId)
    if (!connection) return
    const resolvedTo = resolveComponentPortEndpoint(connection.to)

    patchDocument({
      connections: document.value.connections.filter((item) => item.id !== connectionId),
      repeatBindings: document.value.repeatBindings.filter((item) => item.id !== repeatBindingId(connection.from, resolvedTo.nodeId)),
      nodes: patchConnectedTargetField(
        patchNodeField(document.value.nodes, connection.to.nodeId, connection.to.fieldId, { expression: undefined }),
        connection.to,
        { expression: undefined },
      ),
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
      nodes: patchConnectedTargetField(
        patchNodeField(document.value.nodes, nodeId, fieldId, { expression }),
        { nodeId, fieldId },
        { expression },
      ),
    })

    return true
  }

  function setNodeFieldMode(nodeId: string, fieldId: string, mode: PageBlueprintFieldMode) {
    patchDocument({
      nodes: patchNodeField(document.value.nodes, nodeId, fieldId, { mode }),
    })
  }

  function setNodeLabel(nodeId: string, label: string) {
    if (nodeId.startsWith('blueprint-component:')) {
      setComponentName(componentIdFromNodeId(nodeId), label)
      return
    }
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

    const renamedNodes = document.value.nodes.map((node) => ({
        ...(node.id === nodeId ? { ...node, id: normalized } : node),
        fields: node.fields.map((field) => ({
          ...field,
          expression: field.expression?.replaceAll(`{{ ${nodeId}.`, `{{ ${normalized}.`),
        })),
      }))
    const renamedConnections = document.value.connections.map((connection) => ({
        ...connection,
        id: createConnectionId(renameEndpointNode(connection.from, nodeId, normalized), renameEndpointNode(connection.to, nodeId, normalized)),
        from: renameEndpointNode(connection.from, nodeId, normalized),
        to: renameEndpointNode(connection.to, nodeId, normalized),
        expression: connection.from.nodeId === nodeId
          ? createConnectionExpression(renameEndpointNode(connection.from, nodeId, normalized))
          : connection.expression,
      }))
    const renamedRepeatBindings = document.value.repeatBindings.map((binding) => ({
        ...binding,
        id: repeatBindingId(renameEndpointNode(binding.source, nodeId, normalized), binding.targetNodeId === nodeId ? normalized : binding.targetNodeId),
        source: renameEndpointNode(binding.source, nodeId, normalized),
        targetNodeId: binding.targetNodeId === nodeId ? normalized : binding.targetNodeId,
        targetElementId: binding.targetNodeId === nodeId ? elementIdFromNodeId(normalized) : binding.targetElementId,
      }))
    const renamedComponents = document.value.components.map((component) => ({
        ...component,
        rootNodeId: component.rootNodeId === nodeId ? normalized : component.rootNodeId,
        nodeIds: component.nodeIds.map((item) => item === nodeId ? normalized : item),
        props: component.props.map((port) => ({ ...port, target: renameEndpointNode(port.target, nodeId, normalized) })),
        events: component.events.map((port) => ({ ...port, target: renameEndpointNode(port.target, nodeId, normalized) })),
      }))

    patchDocument({
      nodes: syncComponentNodeFields({ ...document.value, nodes: renamedNodes, components: renamedComponents }),
      nodeLayouts,
      connections: renamedConnections,
      repeatBindings: renamedRepeatBindings,
      components: renamedComponents,
    })

    return true
  }

  function setNodeFieldValue(nodeId: string, fieldId: string, value: string) {
    patchDocument({
      nodes: patchConnectedTargetField(
        patchNodeField(document.value.nodes, nodeId, fieldId, { value, expression: undefined }),
        { nodeId, fieldId },
        { value, expression: undefined },
      ),
      connections: document.value.connections.filter((connection) =>
        !(connection.to.nodeId === nodeId && connection.to.fieldId === fieldId),
      ),
      repeatBindings: isBlueprintRepeatFieldId(fieldId)
        ? document.value.repeatBindings.filter((binding) => binding.targetNodeId !== nodeId)
        : document.value.repeatBindings,
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
      repeatBindings: document.value.repeatBindings.filter((binding) =>
        !(binding.source.nodeId === nodeId && binding.source.fieldId === fieldId)
          && !(binding.targetNodeId === nodeId && fieldId === PAGE_BLUEPRINT_REPEAT_FIELD_ID),
      ),
    })
  }

  function applyRunWorkflowTestResult(nodeId: string, result: unknown) {
    const nextFields = [createRunWorkflowEventField(), ...createBlueprintReturnFieldsFromResult(result)]
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

  function setElementRepeatEnabled(nodeId: string, enabled: boolean) {
    const existingNode = document.value.nodes.find((node) => node.id === nodeId)
    if (!existingNode) return false
    const tag = typeof existingNode.data?.tag === 'string' ? existingNode.data.tag : ''
    if (enabled && !isPageBlockContainer({ tag })) return false

    const hasRepeatField = existingNode.fields.some((field) => isBlueprintRepeatFieldId(field.id))
    if (enabled && hasRepeatField) {
      patchDocument({
        nodes: document.value.nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...(node.data ?? {}), repeatEnabled: true } } : node,
        ),
      })
      return true
    }

    if (enabled) {
      patchDocument({
        nodes: document.value.nodes.map((node) =>
          node.id === nodeId
            ? {
              ...node,
              fields: [...node.fields, createRepeatField()],
              data: { ...(node.data ?? {}), repeatEnabled: true },
            }
            : node,
        ),
      })
      return true
    }

    patchDocument({
      nodes: document.value.nodes.map((node) =>
        node.id === nodeId
          ? {
            ...node,
            fields: node.fields.filter((field) => !isBlueprintRepeatFieldId(field.id)),
            data: { ...(node.data ?? {}), repeatEnabled: false },
          }
          : node,
      ),
      connections: document.value.connections.filter((connection) =>
        !(connection.to.nodeId === nodeId && isBlueprintRepeatFieldId(connection.to.fieldId)),
      ),
      repeatBindings: document.value.repeatBindings.filter((binding) => binding.targetNodeId !== nodeId),
    })
    return true
  }

  function duplicateNode(nodeId: string) {
    const source = document.value.nodes.find((node) => node.id === nodeId)
    if (!source) return null

    if (source.kind === 'component') return duplicateComponentNode(source as PageBlueprintComponentNode)

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

  function duplicateComponentNode(source: PageBlueprintComponentNode) {
    const sourceComponent = document.value.components.find((component) => component.id === source.componentId)
    if (!sourceComponent) return null

    const now = new Date().toISOString()
    const nextComponent = {
      ...sourceComponent,
      id: `page-component:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`,
      name: `${sourceComponent.name} Copy`,
      props: sourceComponent.props.map((port) => ({ ...port })),
      events: sourceComponent.events.map((port) => ({ ...port })),
      createdAt: now,
      updatedAt: now,
    }
    const nextNode: PageBlueprintComponentNode = {
      ...source,
      id: componentNodeId(nextComponent.id),
      componentId: nextComponent.id,
      label: nextComponent.name,
      fields: createComponentNodeFields(nextComponent),
      data: source.data ? { ...source.data } : source.data,
    }
    const sourceLayout = document.value.nodeLayouts[source.id]
    const nextLayout = sourceLayout
      ? { x: sourceLayout.x + 32, y: sourceLayout.y + 32 }
      : {
        x: Math.round((-document.value.viewport.x + 360) / document.value.viewport.zoom),
        y: Math.round((-document.value.viewport.y + 160) / document.value.viewport.zoom),
      }

    patchDocument({
      components: [...document.value.components, nextComponent],
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
    const removedTargets = removedConnections.flatMap((connection) => [
      connection.to,
      componentPortTarget(document.value, connection.to.nodeId, connection.to.fieldId),
    ].filter((endpoint): endpoint is PageBlueprintConnectionEndpoint => Boolean(endpoint)))

    patchDocument({
      nodes: clearConnectionExpressions(
        document.value.nodes.filter((node) => node.id !== nodeId),
        removedTargets,
      ),
      nodeLayouts,
      components: document.value.components.filter((component) => componentNodeId(component.id) !== nodeId),
      connections: document.value.connections.filter((connection) =>
        connection.from.nodeId !== nodeId && connection.to.nodeId !== nodeId,
      ),
      repeatBindings: document.value.repeatBindings.filter((binding) =>
        binding.source.nodeId !== nodeId && binding.targetNodeId !== nodeId,
      ),
    })
  }

  function removeNode(nodeId: string) {
    deleteNode(nodeId)
  }

  function sendElementsToBlueprint(blockIds: string[], blocks: PageBlock[]) {
    const nextNodes = ensureElementNodes(document.value.nodes, blockIds, blocks, false)
    const nodeIds = blockIds
      .map(elementNodeIdFromBlockId)
      .filter((nodeId) => nextNodes.some((node) => node.id === nodeId))
    if (JSON.stringify(nextNodes) !== JSON.stringify(document.value.nodes)) {
      patchDocument({ nodes: syncComponentNodeFields({ ...document.value, nodes: nextNodes }) })
    }
    return nodeIds
  }

  function sendElementsToBlueprintAsGroup(blockIds: string[], blocks: PageBlock[]) {
    const nodeIds = sendElementsToBlueprint(blockIds, blocks)
    return createGroupFromSelection(nodeIds.length ? nodeIds : blockIds.map(elementNodeIdFromBlockId))
  }

  function createGroupFromSelection(nodeIds: string[]) {
    const uniqueNodeIds = [...new Set(nodeIds)].filter((nodeId) =>
      document.value.nodes.some((node) => node.id === nodeId),
    )
    if (uniqueNodeIds.length < 2) return null

    const now = new Date().toISOString()
    const group: PageBlueprintGroup = {
      id: `blueprint-group:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`,
      name: `Group ${document.value.groups.length + 1}`,
      nodeIds: uniqueNodeIds,
      createdAt: now,
      updatedAt: now,
    }
    patchDocument({ groups: [...document.value.groups, group] })
    return group.id
  }

  function beginHistoryBatch() {
    historyBatchSnapshot ??= serialize(document.value)
  }

  function commitHistoryBatch() {
    const snapshot = historyBatchSnapshot
    historyBatchSnapshot = null
    if (!snapshot) return

    const currentSnapshot = serialize(document.value)
    if (currentSnapshot === snapshot) return

    pushUndoSnapshot(snapshot)
    redoStack.value = []
    lastHistorySnapshot.value = currentSnapshot
  }

  function createComponentFromSelection(nodeIds: string[], blocks: PageBlock[]) {
    const blockIds = nodeIds
      .map((nodeId) => elementIdFromNodeId(nodeId))
      .filter(Boolean)
    const sourceDocument = blockIds.length > 0
      ? {
        ...document.value,
        nodes: ensureElementNodes(document.value.nodes, blockIds, blocks, nodeIds.length === 1),
      }
      : document.value
    const result = createPageComponentFromNodeSelection({
      document: sourceDocument,
      blocks,
      nodeIds,
    })
    if (!result) return null

    patchDocument({
      components: [...document.value.components, result.component],
      nodes: [...sourceDocument.nodes, result.node],
      nodeLayouts: {
        ...document.value.nodeLayouts,
        [result.node.id]: result.layout,
      },
    })

    return result.node.id
  }

  function setComponentName(componentId: string, name: string) {
    const normalized = name.trim()
    if (!normalized) return
    const now = new Date().toISOString()
    patchDocument({
      components: document.value.components.map((component) =>
        component.id === componentId ? { ...component, name: normalized, updatedAt: now } : component,
      ),
      nodes: document.value.nodes.map((node) =>
        node.kind === 'component' && componentIdFromNodeId(node.id) === componentId
          ? { ...node, label: normalized }
          : node,
      ),
    })
  }

  function setComponentPortLabel(componentId: string, portId: string, label: string) {
    const normalized = label.trim()
    if (!normalized) return
    const now = new Date().toISOString()
    const nextComponents = document.value.components.map((component) =>
      component.id === componentId
        ? {
          ...component,
          props: component.props.map((port) => port.id === portId ? { ...port, label: normalized } : port),
          events: component.events.map((port) => port.id === portId ? { ...port, label: normalized } : port),
          updatedAt: now,
        }
        : component,
    )

    patchDocument({
      components: nextComponents,
      nodes: syncComponentNodeFields({ ...document.value, components: nextComponents }),
    })
  }

  function patchConnectedTargetField(
    nodes: PageBlueprintDocument['nodes'],
    endpoint: PageBlueprintConnectionEndpoint,
    patch: Partial<PageBlueprintField>,
  ) {
    const target = componentPortTarget(document.value, endpoint.nodeId, endpoint.fieldId)
    return target ? patchNodeField(nodes, target.nodeId, target.fieldId, patch) : nodes
  }

  function resolveComponentPortEndpoint(endpoint: PageBlueprintConnectionEndpoint) {
    return componentPortTarget(document.value, endpoint.nodeId, endpoint.fieldId) ?? endpoint
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
    if (historyBatchSnapshot === null) recordHistory()
    document.value = nextDocument
    lastHistorySnapshot.value = serialize(nextDocument)
  }

  function patchNodeLayout(patch: Partial<PageBlueprintDocument>, options: { history?: boolean }) {
    if (options.history === false) {
      patchDerivedDocument(patch)
      return
    }
    patchDocument(patch)
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
    pushUndoSnapshot(serialize(document.value))
    redoStack.value = []
  }

  function pushUndoSnapshot(snapshot: string) {
    undoStack.value.push(snapshot)
    if (undoStack.value.length > 50) undoStack.value.shift()
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
    setElementRepeatEnabled,
    beginHistoryBatch,
    commitHistoryBatch,
    sendElementsToBlueprint,
    sendElementsToBlueprintAsGroup,
    createGroupFromSelection,
    createComponentFromSelection,
    setComponentName,
    setComponentPortLabel,
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

function ensureElementNodes(
  nodes: PageBlueprintDocument['nodes'],
  blockIds: string[],
  blocks: PageBlock[],
  includeDescendants: boolean,
) {
  const requestedBlockIds = new Set(blockIds)
  const selectedBlocks = flattenPageBlocks(blocks).filter((block) => requestedBlockIds.has(block.id))
  const blocksToAdd = includeDescendants
    ? selectedBlocks.flatMap((block) => flattenPageBlocks([block]))
    : selectedBlocks
  const existingNodeIds = new Set(nodes.map((node) => node.id))
  const nextNodes = [...nodes]

  for (const block of blocksToAdd) {
    const nodeId = elementNodeIdFromBlockId(block.id)
    if (existingNodeIds.has(nodeId)) continue
    nextNodes.push(createElementNodeFromBlock(block))
    existingNodeIds.add(nodeId)
  }

  return nextNodes
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
  const mergedFields = mergeElementFields(node.fields, createElementFieldsFromBlock(block))
  return {
    ...node,
    kind: 'element',
    type: 'page-element',
    label: blockLabelFromBlock(block),
    fields: isPageBlockContainer(block) && shouldKeepRepeatField(node)
      ? ensureRepeatField(mergedFields)
      : mergedFields.filter((field) => !isBlueprintRepeatFieldId(field.id)),
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

function createRepeatField(): PageBlueprintField {
  return {
    id: PAGE_BLUEPRINT_REPEAT_FIELD_ID,
    label: 'Repeat Source',
    type: 'array',
    direction: 'input',
    mode: 'multiple',
    value: '',
    configurable: false,
  }
}

function ensureRepeatField(fields: PageBlueprintField[]) {
  return fields.some((field) => isBlueprintRepeatFieldId(field.id)) ? fields : [...fields, createRepeatField()]
}

function shouldKeepRepeatField(node: PageBlueprintDocument['nodes'][number]) {
  return node.data?.repeatEnabled === true
    || node.fields.some((field) => isBlueprintRepeatFieldId(field.id) && Boolean(field.expression))
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
    mode: id === PAGE_BLUEPRINT_REPEAT_FIELD_ID ? 'multiple' : undefined,
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

function cleanupComponents(
  components: PageBlueprintDocument['components'],
  validNodeIds: Set<string>,
): PageBlueprintDocument['components'] {
  return components
    .map((component) => ({
      ...component,
      nodeIds: component.nodeIds.filter((nodeId) => validNodeIds.has(nodeId)),
      props: component.props.filter((port) => validNodeIds.has(port.target.nodeId)),
      events: component.events.filter((port) => validNodeIds.has(port.target.nodeId)),
    }))
    .filter((component) => component.nodeIds.length > 0)
}

function cleanupGroups(
  groups: PageBlueprintDocument['groups'],
  validNodeIds: Set<string>,
): PageBlueprintDocument['groups'] {
  return groups
    .map((group) => ({
      ...group,
      nodeIds: group.nodeIds.filter((nodeId) => validNodeIds.has(nodeId)),
    }))
    .filter((group) => group.nodeIds.length >= 2)
}

function endpointExists(
  endpoint: PageBlueprintConnectionEndpoint,
  validNodeIds: Set<string>,
  validFieldIds: Map<string, Set<string>>,
) {
  return validNodeIds.has(endpoint.nodeId) && Boolean(validFieldIds.get(endpoint.nodeId)?.has(endpoint.fieldId))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
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
    components: document.components,
    groups: document.groups,
    connections: document.connections,
    repeatBindings: document.repeatBindings,
    collapsedGroups: document.collapsedGroups,
  })
}

function serializeViewport(viewport: BaseCanvasViewport) {
  return JSON.stringify(viewport)
}
