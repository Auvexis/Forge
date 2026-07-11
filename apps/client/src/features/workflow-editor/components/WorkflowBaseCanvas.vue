<template>
  <div ref="shellRef" class="fabric-workflow-base-canvas-shell" data-workflow-base-canvas-shell>
    <BaseCanvas
      ref="baseCanvasRef"
      v-model:viewport="viewport"
      v-model:selection="canvasSelection"
      :items="workflowItems"
      :snap-to-grid="true"
      :grid-size="20"
      :marquee-selection="true"
      background-color="var(--fabric-canvas-bg)"
      pattern-color="var(--fabric-canvas-grid)"
      pattern-style="dot"
      :pattern-size="30"
      class="fabric-workflow-base-canvas"
      data-workflow-base-canvas
      :data-workflow-items-count="workflowItems.length"
      @items-move="handleItemsMove"
      @item-drag-start="workflowStore.beginHistoryTransaction"
      @item-drag-end="workflowStore.commitHistoryTransaction"
    >
      <template #item="{ item }">
        <WorkflowCanvasNodeHost
          :item="item"
          :component="nodeComponentByType[resolveNodeType(item)]"
          :selected="canvasSelection.includes(item.id)"
          :status="resolveNodeStatus(item.id)"
          :has-outgoing-connection="hasNodeOutgoingConnection(item.id)"
          @open-inspector="openNodeInspector"
        />
      </template>
    </BaseCanvas>

    <WorkflowEdgeLayer
      :edges="workflowEdges"
      :items="workflowItems"
      :viewport="viewport"
      :handle-registry="handleRegistry"
      :pending-node-id="pendingQuickAddAlignment?.nodeId ?? null"
    />

    <WorkflowConnectionLayer
      :edges="workflowEdges"
      :viewport="viewport"
      :handle-registry="handleRegistry"
      @connection-create="createWorkflowConnection"
      @connection-cancel="cancelWorkflowConnection"
      @connection-drop="handleConnectionDrop"
    />

    <WorkflowSelectionBox
      :items="workflowItems"
      :selection="canvasSelection"
      :viewport="viewport"
      @duplicate-selection="duplicateSelection"
      @delete-selection="deleteSelection"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  type Component,
} from 'vue'
import type { WorkflowEdge, WorkflowNodeType } from '@/core/types/workflow.types'
import { BaseCanvas } from '@/shared/base-canvas/components.ts'
import type {
  BaseCanvasItem,
  BaseCanvasItemsMoveEvent,
  BaseCanvasViewport,
} from '@/shared/base-canvas/index.ts'
import { useEventBus } from '@/shared/composables/useEventBus'
import { getAdvancedChildPosition, getAdvancedParentBounds } from '../layout/advancedNodeLayout'
import { useWorkflowStore } from '../stores/workflow.store'
import { useExecutionStore } from '../stores/execution.store'
import { useNodeInspectorStore } from '../stores/node-inspector.store'
import {
  deleteWorkflowSelection,
  duplicateWorkflowSelection,
} from '../utils/workflowSelectionActions'
import { shouldRenderLegacyTriggerNode } from '../utils/workflowRunTrigger'
import {
  createWorkflowConnectionEdge,
  getAdvancedNodeHandlersForCanvas,
  getWorkflowConnectionPolicyAction,
  getWorkflowTargetHandlePolicy,
} from '../workflow-canvas/workflowCanvasConnections'
import {
  getQuickAddAlignedNodePosition,
  getWorkflowCanvasCenter,
  getWorkflowCanvasFitViewport,
  getWorkflowCanvasResetZoomViewport,
  screenPointToWorkflowWorld,
  zoomWorkflowCanvasViewport,
} from '../workflow-canvas/workflowCanvasActions'
import {
  normalizeWorkflowSelection,
  selectAllWorkflowNodeIds,
} from '../workflow-canvas/workflowCanvasSelection'
import { workflowToBaseCanvasItems } from '../workflow-canvas/workflowCanvasAdapter'
import WorkflowCanvasNodeHost from './WorkflowCanvasNodeHost.vue'
import WorkflowConnectionLayer from './WorkflowConnectionLayer.vue'
import WorkflowEdgeLayer from './WorkflowEdgeLayer.vue'
import WorkflowSelectionBox from './WorkflowSelectionBox.vue'
import {
  createWorkflowHandleRegistry,
  getWorkflowHandleOffset,
  isWorkflowBaseCanvasHandleModeKey,
  workflowCanvasHandleRegistryKey,
} from '../workflow-canvas/workflowCanvasHandles'
import TriggerNode from './nodes/TriggerNode.vue'
import HttpNode from './nodes/HttpNode.vue'
import CodeNode from './nodes/CodeNode.vue'
import LoopNode from './nodes/LoopNode.vue'
import EventNode from './nodes/EventNode.vue'
import EventListenerNode from './nodes/EventListenerNode.vue'
import PluginNode from './nodes/PluginNode.vue'
import IfNode from './nodes/IfNode.vue'
import CallWorkflowNode from './nodes/CallWorkflowNode.vue'
import ReturnNode from './nodes/ReturnNode.vue'
import SetNode from './nodes/SetNode.vue'
import SwitchNode from './nodes/SwitchNode.vue'
import MergeNode from './nodes/MergeNode.vue'
import SplitInBatchesNode from './nodes/SplitInBatchesNode.vue'
import RespondToWebhookNode from './nodes/RespondToWebhookNode.vue'
import WaitFormNode from './nodes/WaitFormNode.vue'
import AiAgentNode from './nodes/AiAgentNode.vue'
import AiModelNode from './nodes/AiModelNode.vue'
import AiMemoryNode from './nodes/AiMemoryNode.vue'
import AiToolNode from './nodes/AiToolNode.vue'
import TextDatasetNode from './nodes/TextDatasetNode.vue'
import FileDatasetNode from './nodes/FileDatasetNode.vue'
import DatabaseDatasetNode from './nodes/DatabaseDatasetNode.vue'
import EmbeddingsNode from './nodes/EmbeddingsNode.vue'
import VectorStoreNode from './nodes/VectorStoreNode.vue'
import RetrieverNode from './nodes/RetrieverNode.vue'
import BasicLlmChainNode from './nodes/BasicLlmChainNode.vue'
import StructuredJsonParserNode from './nodes/StructuredJsonParserNode.vue'
import VectorStoreRetrieverNode from './nodes/VectorStoreRetrieverNode.vue'
import QuestionAnswerChainNode from './nodes/QuestionAnswerChainNode.vue'
import VectorStoreToolNode from './nodes/VectorStoreToolNode.vue'

const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()
const inspectorStore = useNodeInspectorStore()
const viewport = ref<BaseCanvasViewport>({ x: 0, y: 0, zoom: 1 })
const canvasSelection = ref<string[]>([])
const baseCanvasRef = ref<InstanceType<typeof BaseCanvas> | null>(null)
const handleRegistry = createWorkflowHandleRegistry()
const shellRef = ref<HTMLElement | null>(null)
const nodeToolbarBus = useEventBus<{ action: 'duplicate' | 'delete' | 'disable'; nodeId: string }>(
  'node:toolbar-action',
)
const quickAddBus = useEventBus<{
  sourceId?: string
  sourceHandle?: string
  targetId?: string
  targetHandle?: string
  handlerId?: string
  clientX?: number
  clientY?: number
}>('node:quick-add')
const quickAddBetweenBus = useEventBus<{
  edgeId: string
  sourceId: string
  targetId: string
  sourceHandle?: string
  targetHandle?: string
}>('edge:quick-add-between')

provide(isWorkflowBaseCanvasHandleModeKey, true)
provide(workflowCanvasHandleRegistryKey, handleRegistry)

const nodeComponentByType: Record<string, Component> = {
  trigger: TriggerNode,
  http: HttpNode,
  code: CodeNode,
  loop: LoopNode,
  event: EventNode,
  'event-listener': EventListenerNode,
  plugin: PluginNode,
  if: IfNode,
  'call-workflow': CallWorkflowNode,
  return: ReturnNode,
  set: SetNode,
  switch: SwitchNode,
  merge: MergeNode,
  'split-in-batches': SplitInBatchesNode,
  'respond-webhook': RespondToWebhookNode,
  'wait-form': WaitFormNode,
  'ai-agent': AiAgentNode,
  'ai-model': AiModelNode,
  'ai-memory': AiMemoryNode,
  'ai-tool': AiToolNode,
  'text-dataset': TextDatasetNode,
  'file-dataset': FileDatasetNode,
  'database-dataset': DatabaseDatasetNode,
  embeddings: EmbeddingsNode,
  'vector-store': VectorStoreNode,
  retriever: RetrieverNode,
  'basic-llm-chain': BasicLlmChainNode,
  'structured-json-parser': StructuredJsonParserNode,
  'vector-store-retriever': VectorStoreRetrieverNode,
  'question-answer-chain': QuestionAnswerChainNode,
  'vector-store-tool': VectorStoreToolNode,
}

const workflowItems = computed(() => {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return []
  return workflowToBaseCanvasItems(workflow, {
    includeLegacyTrigger: shouldRenderLegacyTriggerNode(workflow),
  })
})

const workflowEdges = computed(() => workflowStore.activeWorkflow?.edges ?? [])
const selectableNodeIds = computed(() => ({
  includeTrigger: workflowItems.value.some((item) => item.id === 'trigger'),
  nodeIds: Object.keys(workflowStore.activeWorkflow?.nodes ?? {}),
}))
let quickAddSourceId: string | null = null
let quickAddSourceHandle: string | null = null
let quickAddTargetId: string | null = null
let quickAddTargetHandle: string | null = null
let pendingAddNodePoint: { x: number; y: number } | null = null
let pendingInsertEdgeId: string | null = null
let pendingInsertSourceId: string | null = null
let pendingInsertTargetId: string | null = null
let pendingInsertTargetHandle: string | null = null
const pendingQuickAddAlignment = ref<{
  anchorNodeId: string
  anchorHandle: string
  anchorType: 'source' | 'target'
  nodeId: string
  nodeHandle: string
  nodeHandleType: 'source' | 'target'
  horizontalGap: number
} | null>(null)
const QUICK_ADD_HORIZONTAL_GAP = 160

nodeToolbarBus.on(handleNodeToolbarAction)
quickAddBus.on((payload) => {
  quickAddSourceId = payload?.sourceId ?? null
  quickAddSourceHandle = payload?.sourceHandle ?? null
  quickAddTargetId = payload?.targetId ?? null
  quickAddTargetHandle = payload?.targetHandle ?? null
})
quickAddBetweenBus.on((payload) => {
  pendingInsertEdgeId = payload?.edgeId ?? null
  pendingInsertSourceId = payload?.sourceId ?? null
  pendingInsertTargetId = payload?.targetId ?? null
  pendingInsertTargetHandle = payload?.targetHandle ?? null
  quickAddSourceId = payload?.sourceId ?? null
  quickAddSourceHandle = payload?.sourceHandle ?? null
  quickAddTargetId = null
  quickAddTargetHandle = null
})

watch(
  [workflowItems, canvasSelection],
  () => {
    const normalized = normalizeWorkflowSelection({
      ...selectableNodeIds.value,
      selection: canvasSelection.value,
    })
    if (normalized.join('|') !== canvasSelection.value.join('|')) {
      canvasSelection.value = normalized
    }
  },
  { flush: 'post' },
)

watch(() => handleRegistry.geometryVersion.value, alignPendingQuickAddNode, { flush: 'post' })

onMounted(() => {
  window.addEventListener('keydown', handleWorkflowCanvasKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWorkflowCanvasKeyDown)
})

function resolveNodeType(item: BaseCanvasItem): string {
  if (item.id === 'trigger') return 'trigger'
  return String((item.data as { type?: string } | undefined)?.type ?? '')
}

function resolveNodeStatus(nodeId: string) {
  return executionStore.nodeStatuses[nodeId]?.status ?? 'idle'
}

function hasNodeOutgoingConnection(nodeId: string): boolean {
  return workflowStore.activeWorkflow?.edges.some((edge) => edge.source === nodeId) ?? false
}

function handleItemsMove(event: BaseCanvasItemsMoveEvent) {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return

  for (const itemId of event.itemIds) {
    const node = itemId === 'trigger' ? workflow.trigger : workflow.nodes[itemId]
    if (!node) continue

    node.ui = {
      ...node.ui,
      positionX: (node.ui?.positionX ?? 0) + event.delta.x,
      positionY: (node.ui?.positionY ?? 0) + event.delta.y,
    }
  }
}

async function handleRun() {
  if (!workflowStore.activeWorkflow) return
  await executionStore.execute(workflowStore.activeWorkflow.metadata.id, {})
}

async function handleStop() {
  await executionStore.cancel()
}

function openAddNodePanel(
  sourceId?: string | null,
  handlerId?: string | null,
  point?: { x: number; y: number } | null,
) {
  quickAddSourceId = sourceId || null
  if (handlerId) quickAddTargetHandle = handlerId
  pendingAddNodePoint = point ?? null
}

function addLogicNodeAtViewportCenter(
  type: WorkflowNodeType,
  providedDefaults: Record<string, unknown> = {},
) {
  return addLogicNode(
    type,
    providedDefaults,
    takePendingAddNodePosition() ?? getCanvasCenterPosition(),
  )
}

function addPluginNodeAtViewportCenter(pluginId: string, action: string, actionName: string) {
  return addPluginNode(
    pluginId,
    action,
    actionName,
    takePendingAddNodePosition() ?? getCanvasCenterPosition(),
  )
}

function addLogicNodeAtScreenPoint(
  type: WorkflowNodeType,
  point: { x: number; y: number },
  providedDefaults: Record<string, unknown> = {},
) {
  return addLogicNode(type, providedDefaults, screenToCanvasWorld(point))
}

function addPluginNodeAtScreenPoint(
  pluginId: string,
  action: string,
  actionName: string,
  point: { x: number; y: number },
) {
  return addPluginNode(pluginId, action, actionName, screenToCanvasWorld(point))
}

function addLogicNode(
  type: WorkflowNodeType,
  providedDefaults: Record<string, unknown> = {},
  position = getCanvasCenterPosition(),
) {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return undefined

  const id = generateNodeId(type)
  workflow.nodes[id] = {
    type,
    name: String(providedDefaults.name ?? defaultNodeName(type, id)),
    ui: { positionX: position.x, positionY: position.y },
    ...getLogicNodeDefaults(type),
    ...providedDefaults,
  } as any

  connectNewNode(id, type)
  return id
}

function addPluginNode(
  pluginId: string,
  action: string,
  actionName: string,
  position = getCanvasCenterPosition(),
) {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return undefined

  const id = generateNodeId(action)
  workflow.nodes[id] = {
    type: 'plugin',
    name: actionName,
    pluginId,
    action,
    params: {},
    ui: { positionX: position.x, positionY: position.y },
  } as any

  connectNewNode(id, 'plugin')
  return id
}

function connectNewNode(nodeId: string, type: WorkflowNodeType | 'plugin') {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return

  const sourceId = quickAddSourceId
  const sourceHandle = quickAddSourceHandle
  const targetId = quickAddTargetId
  const targetHandle = quickAddTargetHandle
  clearQuickAddState()

  if (pendingInsertEdgeId && pendingInsertSourceId && pendingInsertTargetId) {
    insertNodeBetween(
      pendingInsertEdgeId,
      nodeId,
      pendingInsertSourceId,
      pendingInsertTargetId,
      pendingInsertTargetHandle,
    )
    return
  }

  if (targetId && targetHandle) {
    if (targetHandle === 'target') {
      pendingQuickAddAlignment.value = {
        anchorNodeId: targetId,
        anchorHandle: targetHandle,
        anchorType: 'target',
        nodeId,
        nodeHandle: 'source',
        nodeHandleType: 'source',
        horizontalGap: -QUICK_ADD_HORIZONTAL_GAP,
      }
    }
    workflow.edges.push(
      createWorkflowConnectionEdge({
        source: nodeId,
        target: targetId,
        sourceHandle: 'source',
        targetHandle,
      }),
    )
    arrangeAdvancedConfigNodes(targetId)
  } else if (targetId) {
    pendingQuickAddAlignment.value = {
      anchorNodeId: targetId,
      anchorHandle: 'target',
      anchorType: 'target',
      nodeId,
      nodeHandle: 'source',
      nodeHandleType: 'source',
      horizontalGap: -QUICK_ADD_HORIZONTAL_GAP,
    }
    workflow.edges.push(
      createWorkflowConnectionEdge({
        source: nodeId,
        target: targetId,
        sourceHandle: 'source',
        targetHandle: 'target',
      }),
    )
  } else if (sourceId && type !== 'trigger') {
    pendingQuickAddAlignment.value = {
      anchorNodeId: sourceId,
      anchorHandle: sourceHandle ?? 'source',
      anchorType: 'source',
      nodeId,
      nodeHandle: 'target',
      nodeHandleType: 'target',
      horizontalGap: QUICK_ADD_HORIZONTAL_GAP,
    }
    workflow.edges.push(
      createWorkflowConnectionEdge({
        source: sourceId,
        target: nodeId,
        sourceHandle: sourceHandle ?? 'source',
        targetHandle: 'target',
      }),
    )
  }
}

function alignPendingQuickAddNode() {
  const pending = pendingQuickAddAlignment.value
  const workflow = workflowStore.activeWorkflow
  if (!pending || !workflow) return

  const anchorItem = workflowItems.value.find((item) => item.id === pending.anchorNodeId)
  const nodeItem = workflowItems.value.find((item) => item.id === pending.nodeId)
  const anchorHandle = handleRegistry.getHandle(
    pending.anchorNodeId,
    pending.anchorHandle,
    pending.anchorType,
  )
  const nodeHandle = handleRegistry.getHandle(
    pending.nodeId,
    pending.nodeHandle,
    pending.nodeHandleType,
  )
  const anchorOffset = anchorHandle ? getWorkflowHandleOffset(anchorHandle) : null
  const nodeOffset = nodeHandle ? getWorkflowHandleOffset(nodeHandle) : null
  const node = workflow.nodes[pending.nodeId]
  if (!anchorItem || !nodeItem || !anchorOffset || !nodeOffset || !node) return

  const position = getQuickAddAlignedNodePosition({
    sourceHandle: { x: anchorItem.x + anchorOffset.x, y: anchorItem.y + anchorOffset.y },
    targetHandle: { x: nodeItem.x + nodeOffset.x, y: nodeItem.y + nodeOffset.y },
    nodePosition: { x: nodeItem.x, y: nodeItem.y },
    horizontalGap: pending.horizontalGap,
  })
  node.ui = { ...node.ui, positionX: position.x, positionY: position.y }

  nextTick(() => {
    pendingQuickAddAlignment.value = null
    handleRegistry.invalidateGeometry()
  })
}

function insertNodeBetween(
  edgeId: string,
  newNodeId: string,
  oldSourceId: string,
  oldTargetId: string,
  oldTargetHandle: string | null,
) {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return
  const oldEdge = workflow.edges.find((edge) => edge.id === edgeId)
  workflow.edges = workflow.edges.filter((edge) => edge.id !== edgeId)
  workflow.edges.push({
    id: `e-${oldSourceId}-${newNodeId}-${Date.now()}`,
    source: oldSourceId,
    target: newNodeId,
    sourceHandle: oldEdge?.sourceHandle ?? 'source',
    targetHandle: 'target',
  })
  workflow.edges.push({
    id: `e-${newNodeId}-${oldTargetId}-${Date.now()}`,
    source: newNodeId,
    target: oldTargetId,
    sourceHandle: 'source',
    targetHandle: oldTargetHandle ?? oldEdge?.targetHandle ?? 'target',
  })
  pendingInsertEdgeId = null
  pendingInsertSourceId = null
  pendingInsertTargetId = null
  pendingInsertTargetHandle = null
}

function clearQuickAddState() {
  quickAddSourceId = null
  quickAddSourceHandle = null
  quickAddTargetId = null
  quickAddTargetHandle = null
  pendingAddNodePoint = null
}

function takePendingAddNodePosition() {
  const point = pendingAddNodePoint
  pendingAddNodePoint = null
  return point
}

function zoomIn() {
  animateWorkflowViewport(zoomBy(1.2))
}

function zoomOut() {
  animateWorkflowViewport(zoomBy(1 / 1.2))
}

function zoomReset() {
  animateWorkflowViewport(getWorkflowCanvasResetZoomViewport(viewport.value))
}

function fitWorkflowView() {
  const rect = getCanvasRect()
  if (!rect) return
  const next = getWorkflowCanvasFitViewport({
    items: workflowItems.value,
    canvasRect: rect,
    padding: 80,
    minZoom: 0.5,
    maxZoom: 1.5,
  })
  if (next) animateWorkflowViewport(next)
}

function zoomBy(factor: number) {
  const rect = getCanvasRect()
  if (!rect) return viewport.value
  return zoomWorkflowCanvasViewport({
    viewport: viewport.value,
    canvasRect: rect,
    factor,
    minZoom: 0.5,
    maxZoom: 1.5,
  })
}

function animateWorkflowViewport(next: BaseCanvasViewport) {
  if (baseCanvasRef.value) {
    baseCanvasRef.value.animateViewportTo(next)
    return
  }
  viewport.value = next
}

function getCanvasCenterPosition() {
  const rect = getCanvasRect()
  if (!rect) return { x: 0, y: 0 }
  return getWorkflowCanvasCenter({ canvasRect: rect, viewport: viewport.value })
}

function screenToCanvasWorld(point: { x: number; y: number }) {
  const rect = getCanvasRect()
  if (!rect) return point
  return screenPointToWorkflowWorld({ point, canvasRect: rect, viewport: viewport.value })
}

function getCanvasRect() {
  const rect = shellRef.value?.getBoundingClientRect()
  if (!rect) return null
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
}

function generateNodeId(prefix: string) {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return `${prefix}_1`
  let counter = prefix === 'trigger' ? 0 : 1
  let id = `${prefix}_${counter}`
  while (workflow.nodes[id]) {
    counter++
    id = `${prefix}_${counter}`
  }
  return id
}

function defaultNodeName(type: WorkflowNodeType, id: string) {
  const names: Partial<Record<WorkflowNodeType, string>> = {
    trigger: 'Trigger',
    code: 'Code Block',
    if: 'Conditional',
    loop: 'Loop / ForEach',
    'call-workflow': 'Call Workflow',
    return: 'Return',
    http: 'HTTP Request',
    event: 'Emit Event',
    'event-listener': 'Wait for Event',
    plugin: 'Plugin Action',
    set: 'Set Fields',
    switch: 'Switch',
    merge: 'Merge',
    'split-in-batches': 'Split In Batches',
    'respond-webhook': 'Respond to Webhook',
    'wait-form': 'Wait for Form',
    'ai-agent': 'AI Agent',
    'ai-model': 'AI Model',
    'ai-memory': 'AI Memory',
    'ai-tool': 'AI Tool',
    'text-dataset': 'Text Dataset',
    'file-dataset': 'Extract From File',
    'database-dataset': 'Database Dataset',
    embeddings: 'Embeddings',
    'vector-store': 'Vector Store',
    retriever: 'Retriever',
    'basic-llm-chain': 'Basic LLM Chain',
    'structured-json-parser': 'Structured JSON Parser',
    'vector-store-retriever': 'Vector Store Retriever',
    'question-answer-chain': 'Question and Answer Chain',
    'vector-store-tool': 'Vector Store Tool',
  }
  return names[type] ?? id
}

function getLogicNodeDefaults(type: WorkflowNodeType): Record<string, unknown> {
  if (type === 'http') return { url: 'https://api.example.com', method: 'GET' }
  if (type === 'code') return { language: 'javascript', script: 'return { status: "ok" };' }
  if (type === 'if') return { condition: 'true' }
  if (type === 'loop') return { collection: '[]', maxIterations: 100 }
  if (type === 'return') return { mode: 'all-steps' }
  if (type === 'set') return { assignments: [{ key: 'field', value: '' }] }
  if (type === 'switch')
    return { inputExpression: 'steps.prev.output.status', cases: [], fallbackHandleId: 'fallback' }
  if (type === 'merge') return { mode: 'wait-any' }
  if (type === 'ai-model') return { temperature: 0.2 }
  if (type === 'ai-agent')
    return {
      prompt: 'You are a helpful workflow agent. Use tools only when needed.',
      executionMode: 'loop',
      maxIterations: 8,
      maxToolCalls: 12,
      maxRetriesPerTool: 3,
      timeoutMs: 180000,
      requireApprovalForSideEffects: [
        'write',
        'delete',
        'external-message',
        'external-payment',
        'filesystem',
      ],
      outputMode: 'text',
    }
  if (type === 'ai-tool')
    return {
      requiresApproval: true,
      sideEffect: 'write',
    }
  if (type === 'text-dataset')
    return {
      format: 'plain-text',
      chunkSize: 1000,
      chunkOverlap: 120,
    }
  if (type === 'file-dataset')
    return {
      filePath: '',
      chunkSize: 1000,
      chunkOverlap: 120,
    }
  if (type === 'database-dataset')
    return {
      connectionId: '',
      textColumns: ['body'],
      chunkSize: 1000,
      chunkOverlap: 120,
    }
  if (type === 'embeddings') return {}
  if (type === 'vector-store')
    return {
      ensureCollectionMethodId: 'ensureCollection',
      upsertMethodId: 'upsertDocuments',
      queryMethodId: 'querySimilar',
      metric: 'cosine',
    }
  if (type === 'retriever')
    return {
      outputMode: 'context',
      topK: 5,
    }
  return {}
}

function selectAllNodes() {
  canvasSelection.value = selectAllWorkflowNodeIds(selectableNodeIds.value)
}

function clearSelection() {
  canvasSelection.value = []
}

function deleteSelection() {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return
  const result = deleteWorkflowSelection(workflow, canvasSelection.value)
  if (result.nodeIds.length === 0) return
  canvasSelection.value = []
}

function duplicateSelection() {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return
  const result = duplicateWorkflowSelection(workflow, canvasSelection.value)
  if (result.nodeIds.length === 0) return
  canvasSelection.value = result.nodeIds
}

function handleNodeToolbarAction(
  payload: { action: 'duplicate' | 'delete' | 'disable'; nodeId: string } | undefined,
) {
  if (!payload) return
  if (payload.action === 'duplicate') duplicateNodeFromToolbar(payload.nodeId)
  if (payload.action === 'delete') deleteNodeFromToolbar(payload.nodeId)
  if (payload.action === 'disable') toggleNodeDisabled(payload.nodeId)
}

function duplicateNodeFromToolbar(nodeId: string) {
  canvasSelection.value = [nodeId]
  duplicateSelection()
}

function deleteNodeFromToolbar(nodeId: string) {
  canvasSelection.value = [nodeId]
  deleteSelection()
}

function toggleNodeDisabled(nodeId: string) {
  const node = workflowStore.activeWorkflow?.nodes[nodeId]
  if (!node) return
  node.disabled = !node.disabled
}

function handleWorkflowCanvasKeyDown(event: KeyboardEvent) {
  if (isEditableKeyTarget(event.target)) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault()
    selectAllNodes()
    return
  }
  if (event.key === 'Escape') {
    clearSelection()
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    deleteSelection()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault()
    duplicateSelection()
  }
}

function isEditableKeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function createWorkflowConnection(
  connection: Pick<WorkflowEdge, 'source' | 'target' | 'sourceHandle' | 'targetHandle'>,
) {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return

  const targetHandle = connection.targetHandle ?? 'target'
  const policy = getWorkflowTargetHandlePolicy(workflow, connection.target, targetHandle)
  const connectionCount = workflow.edges.filter(
    (edge) => edge.target === connection.target && (edge.targetHandle ?? 'target') === policy.id,
  ).length

  if (getWorkflowConnectionPolicyAction(policy, connectionCount) === 'replace') {
    workflow.edges = workflow.edges.filter(
      (edge) =>
        !(edge.target === connection.target && (edge.targetHandle ?? 'target') === policy.id),
    )
  }

  workflow.edges.push(createWorkflowConnectionEdge(connection))
  arrangeAdvancedConfigNodes(connection.target)
}

function cancelWorkflowConnection() {
  // The BaseCanvas connection path owns no external draft state yet.
}

function handleConnectionDrop(payload: {
  start: { nodeId: string; handleId: string; type: 'source' | 'target' }
  clientPoint: { x: number; y: number }
}) {
  if (payload.start.type === 'source') {
    quickAddBus.emit({
      sourceId: payload.start.nodeId,
      sourceHandle: payload.start.handleId,
      clientX: payload.clientPoint.x,
      clientY: payload.clientPoint.y,
    })
    return
  }

  quickAddBus.emit({
    targetId: payload.start.nodeId,
    targetHandle: payload.start.handleId,
    handlerId: payload.start.handleId,
    clientX: payload.clientPoint.x,
    clientY: payload.clientPoint.y,
  })
}

function cancelPendingAddNode() {
  clearQuickAddState()
  pendingQuickAddAlignment.value = null
  pendingInsertEdgeId = null
  pendingInsertSourceId = null
  pendingInsertTargetId = null
  pendingInsertTargetHandle = null
}

function arrangeAdvancedConfigNodes(targetId: string, visited = new Set<string>()) {
  const workflow = workflowStore.activeWorkflow
  if (!workflow || visited.has(targetId)) return
  visited.add(targetId)

  const targetItem = workflowItems.value.find((item) => item.id === targetId)
  if (!targetItem) return

  const handlers = getAdvancedNodeHandlersForCanvas(workflow, targetId)
  handlers.forEach((handler, handlerIndex) => {
    const edges = workflow.edges.filter(
      (edge) => edge.target === targetId && edge.targetHandle === handler.id,
    )
    edges.forEach((edge, siblingIndex) => {
      const sourceNode = workflow.nodes[edge.source]
      if (!sourceNode) return

      const position = getAdvancedChildPosition({
        parent: getAdvancedParentBounds(
          { x: targetItem.x, y: targetItem.y },
          {
            width: targetItem.width ?? 236,
            height: targetItem.height ?? 100,
          },
        ),
        side: handler.position,
        handlerIndex,
        handlerCount: handlers.length,
        siblingIndex,
      })

      sourceNode.ui = {
        ...sourceNode.ui,
        positionX: position.x,
        positionY: position.y,
      }
      arrangeAdvancedConfigNodes(edge.source, visited)
    })
  })
}

function openNodeInspector(item: BaseCanvasItem) {
  inspectorStore.openInspector({
    id: item.id,
    type: resolveNodeType(item),
    position: { x: item.x, y: item.y },
    data: item.data,
  } as any)
}

defineExpose({
  handleRun,
  handleStop,
  openAddNodePanel,
  cancelPendingAddNode,
  addLogicNodeAtViewportCenter,
  addPluginNodeAtViewportCenter,
  addLogicNodeAtScreenPoint,
  addPluginNodeAtScreenPoint,
  selectAllNodes,
  clearSelection,
  duplicateSelection,
  deleteSelection,
  zoomIn,
  zoomOut,
  zoomReset,
  fitWorkflowView,
})
</script>

<style scoped>
.fabric-workflow-base-canvas-shell {
  position: relative;
  width: 100%;
  height: 100%;
}

.fabric-workflow-base-canvas {
  width: 100%;
  height: 100%;
}

.fabric-workflow-base-canvas :deep(.base-canvas__viewport) {
  z-index: 5;
}
</style>
