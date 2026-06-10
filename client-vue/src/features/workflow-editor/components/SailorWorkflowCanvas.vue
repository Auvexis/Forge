<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount, nextTick } from 'vue'
import { VueFlow } from '@vue-flow/core'
import type { Node, Edge, NodeMouseEvent, NodeDragEvent, Connection, VueFlowStore } from '@vue-flow/core'
import { useWorkflowStore } from '../stores/workflow.store'
import { useExecutionStore } from '../stores/execution.store'
import TriggerNode from './nodes/TriggerNode.vue'
import HttpNode from './nodes/HttpNode.vue'
import CodeNode from './nodes/CodeNode.vue'
import LoopNode from './nodes/LoopNode.vue'
import EventNode from './nodes/EventNode.vue'
import EventListenerNode from './nodes/EventListenerNode.vue'
import PluginNode from './nodes/PluginNode.vue'
import IfNode from './nodes/IfNode.vue'
import SubWorkflowNode from './nodes/SubWorkflowNode.vue'
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
import BaseEdge from './BaseEdge.vue'
import NodeGroupSelectionBox from './NodeGroupSelectionBox.vue'
import { Background } from '@vue-flow/background'

import { useNodeInspectorStore } from '../stores/node-inspector.store'
import NodeInspectorModal from './settings/NodeInspectorModal.vue'
import AddNodePanel from './settings/AddNodePanel.vue'
import type { WorkflowNodeType, WorkflowNode } from '@/core/types/workflow.types'
import { useEventBus } from '@/shared/composables/useEventBus'
import { isCanvasSelecting } from '../composables/useCanvasSelecting'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import {
  deleteWorkflowSelection,
  duplicateWorkflowSelection,
} from '../utils/workflowSelectionActions'
import { shouldRenderLegacyTriggerNode } from '../utils/workflowRunTrigger'

// Stores
const workflowStore = useWorkflowStore()
const inspectorStore = useNodeInspectorStore()
const executionStore = useExecutionStore()
const vueFlowStore = ref<VueFlowStore | null>(null)

// ── Props / emits (for v-model:show-logs from parent page) ──────────────────
const props = defineProps<{
  showLogs?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show-logs', value: boolean): void
}>()

// ── Local alias so internal logic can still read the value ────────────────
const showLogsLocal = computed(() => props.showLogs ?? false)
const isWorkflowEmpty = computed(() => {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return false
  return Object.keys(workflow.nodes).length === 0 && workflow.edges.length === 0
})

//
// ── Inicialização única dos nodes/edges ────────────────────────────────────
//
// Usamos refs locais em vez de computed para que o VueFlow seja o "dono"
// das posições internamente. Se usássemos computed, cada chamada a
// updateNodeData() (ex: ao arrastar) recalcularia posições de TODOS os nodes
// via Pinia, o que faz o VueFlow reposicionar os outros nodes com um skip.
//
const vueFlowNodes = ref<Node[]>([])
const vueFlowEdges = ref<Edge[]>([])
const switchHandleSignatures = ref<Record<string, string>>({})
const isApplyingGraphSnapshot = ref(false)

async function onVueFlowInit(instance: VueFlowStore) {
  vueFlowStore.value = instance
  await nextTick()
  instance.updateNodeInternals()
}

function buildNodes() {
  if (!workflowStore.activeWorkflow) return []
  const normalNodes: Node[] = Object.entries(workflowStore.activeWorkflow.nodes).map(
    ([nodeId, nodeData]) => ({
      id: nodeId,
      type: nodeData.type,
      position: { x: nodeData.ui?.positionX ?? 0, y: nodeData.ui?.positionY ?? 0 },
      data: nodeData,
    }),
  )

  if (!shouldRenderLegacyTriggerNode(workflowStore.activeWorkflow)) return normalNodes

  const triggerNode: Node = {
    id: 'trigger',
    type: 'trigger',
    position: {
      x: workflowStore.activeWorkflow.trigger.ui?.positionX ?? 0,
      y: workflowStore.activeWorkflow.trigger.ui?.positionY ?? 0,
    },
    data: workflowStore.activeWorkflow.trigger,
  }

  return [triggerNode, ...normalNodes]
}

function buildEdges() {
  if (!workflowStore.activeWorkflow) return []
  return workflowStore.activeWorkflow.edges.map((edge) => ({
    ...edge,
    type: 'workflow-edge',
  }))
}

function getSwitchHandleSignature(nodeData: WorkflowNode): string | null {
  if (nodeData.type !== 'switch') return null
  const handles = [
    ...((nodeData.cases ?? []).map((switchCase) => switchCase.handleId)),
    nodeData.fallbackHandleId ?? '',
  ]
  return handles.join('|')
}

async function replaceGraphFromStore() {
  isApplyingGraphSnapshot.value = true
  vueFlowNodes.value = buildNodes()
  vueFlowEdges.value = buildEdges()
  await nextTick()
  isApplyingGraphSnapshot.value = false
}

// Limpa o estado global do VueFlow ao sair do editor para evitar "fantasmas"
onBeforeUnmount(() => {
  isApplyingGraphSnapshot.value = true
  const instance = vueFlowStore.value
  if (!instance) return

  if (instance.nodes.length > 0) instance.removeNodes(instance.nodes)
  if (instance.edges.length > 0) instance.removeEdges(instance.edges)
})

// Reinicializa o VueFlow apenas quando muda o workflow (não a cada edição de campo)
watch(
  () => workflowStore.activeWorkflow?.metadata?.id,
  () => replaceGraphFromStore(),
  { immediate: true },
)

watch(
  () => workflowStore.graphUpdateTrigger,
  () => replaceGraphFromStore(),
)

watch(
  () => workflowStore.activeWorkflow?.edges.map((edge) => `${edge.id}:${edge.source}:${edge.sourceHandle ?? ''}:${edge.target}:${edge.targetHandle ?? ''}`).join('|'),
  () => {
    if (isApplyingGraphSnapshot.value) return
    vueFlowEdges.value = buildEdges()
  },
)

/**
 * Sincroniza as mutações do store de volta para o data interno do VueFlow.
 *
 * VueFlow inicializa o `data` de cada node a partir de `vueFlowNodes` uma única
 * vez. Chamadas subsequentes a `updateNodeData()` atualizam o store mas NÃO
 * propagam automaticamente para os objetos internos do VueFlow — então o body
 * do node no canvas fica desatualizado.
 *
 * Estratégia: observamos `nodes` e `trigger` com `deep: true` e, a cada
 * mudança, percorremos `vueFlowNodes` atualizando SOMENTE o campo `.data` de
 * cada node pelo seu ID.  Não recriamos o array inteiro, preservando o estado
 * interno do VueFlow (posições, seleção, etc.).
 */
watch(
  () => ({
    nodes: workflowStore.activeWorkflow?.nodes,
    trigger: workflowStore.activeWorkflow?.trigger,
  }),
  ({ nodes, trigger }) => {
    if (!nodes && !trigger) return

    for (const vfNode of vueFlowNodes.value) {
      if (vfNode.id === 'trigger' && !nodes?.[vfNode.id]) {
        if (trigger && vfNode.data !== trigger) {
          Object.assign(vfNode.data, trigger)
        }
      } else if (nodes) {
        const storeData = nodes[vfNode.id]
        if (storeData && vfNode.data !== storeData) {
          Object.assign(vfNode.data, storeData)
        }
      }
    }
  },
  { deep: true },
)

watch(
  () => workflowStore.activeWorkflow?.nodes,
  async (workflowNodes) => {
    if (!workflowNodes) return

    const changedSwitchIds: string[] = []
    const nextSignatures: Record<string, string> = {}

    for (const [nodeId, nodeData] of Object.entries(workflowNodes)) {
      const signature = getSwitchHandleSignature(nodeData)
      if (signature === null) continue

      nextSignatures[nodeId] = signature
      if (switchHandleSignatures.value[nodeId] !== signature) {
        changedSwitchIds.push(nodeId)
      }
    }

    switchHandleSignatures.value = nextSignatures
    if (changedSwitchIds.length === 0) return

    await nextTick()
    vueFlowStore.value?.updateNodeInternals(changedSwitchIds)
  },
  { deep: true, immediate: true, flush: 'post' },
)

// ── Eventos ─────────────────────────────────────────────────────────────────

const onNodeDoubleClick = (event: NodeMouseEvent) => {
  inspectorStore.openInspector(event.node)
}

// ── Add Node ─────────────────────────────────────────────────────────────────

/**
 * Retorna a posição no mundo (canvas coords) do centro atual da viewport.
 * Usamos isso para adicionar novo node sempre visível na tela.
 */
function getCenterPosition(): { x: number; y: number } {
  const canvas = document.querySelector('.sailor-workflow-canvas') as HTMLElement | null
  const bounds = canvas?.getBoundingClientRect()
  const screenCenter = {
    x: (bounds?.left ?? 0) + (bounds?.width ?? window.innerWidth) / 2,
    y: (bounds?.top ?? 0) + (bounds?.height ?? window.innerHeight) / 2,
  }

  return vueFlowStore.value?.screenToFlowCoordinate(screenCenter) ?? screenCenter
}

let quickAddSourceId: string | null = null
let quickAddSourceHandle: string | null = null
let quickAddTargetId: string | null = null
let quickAddTargetHandle: string | null = null
let quickAddAgentConfigHandle: 'chatModel' | 'memory' | 'tool' | null = null

const AGENT_CONFIG_HANDLES = ['chatModel', 'memory', 'tool'] as const
type AddNodePickerAnchorRect = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>
type AddNodePickerAnchor = { clientX?: number; clientY?: number; anchorRect?: AddNodePickerAnchorRect }
type AddNodePickerSecondarySide = 'right' | 'left'

const ADD_NODE_PICKER_COLUMN_WIDTH = 288
const ADD_NODE_PICKER_GAP = 8
const ADD_NODE_PICKER_CASCADE_WIDTH = ADD_NODE_PICKER_COLUMN_WIDTH * 2 + ADD_NODE_PICKER_GAP
const ADD_NODE_PICKER_HEIGHT = 458
const ADD_NODE_PICKER_MARGIN = 12

const addNodePickerOverlay = ref<{
  left: number
  top: number
  secondarySide: AddNodePickerSecondarySide
  agentConfigHandle: 'chatModel' | 'memory' | 'tool' | null
} | null>(null)

const addNodePickerStyle = computed(() => ({
  left: `${addNodePickerOverlay.value?.left ?? ADD_NODE_PICKER_MARGIN}px`,
  top: `${addNodePickerOverlay.value?.top ?? ADD_NODE_PICKER_MARGIN}px`,
}))

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function getAddNodePickerPosition(anchor?: AddNodePickerAnchor | null): { left: number; top: number; secondarySide: AddNodePickerSecondarySide } {
  const anchorRect = anchor?.anchorRect
  const fallback = {
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2,
  }
  const point =
    typeof anchor?.clientX === 'number' && typeof anchor.clientY === 'number'
      ? { clientX: anchor.clientX, clientY: anchor.clientY }
      : fallback
  const rightSpace = anchorRect ? window.innerWidth - anchorRect.right : window.innerWidth - point.clientX
  const leftSpace = anchorRect ? anchorRect.left : point.clientX
  const secondarySide: AddNodePickerSecondarySide =
    rightSpace >= ADD_NODE_PICKER_CASCADE_WIDTH || rightSpace >= leftSpace ? 'right' : 'left'
  const rightPrimaryMin = ADD_NODE_PICKER_MARGIN
  const rightPrimaryMax = window.innerWidth - ADD_NODE_PICKER_CASCADE_WIDTH - ADD_NODE_PICKER_MARGIN
  const leftPrimaryMin = ADD_NODE_PICKER_MARGIN + ADD_NODE_PICKER_COLUMN_WIDTH + ADD_NODE_PICKER_GAP
  const leftPrimaryMax = window.innerWidth - ADD_NODE_PICKER_COLUMN_WIDTH - ADD_NODE_PICKER_MARGIN
  const bottomAlignedTop = window.innerHeight - ADD_NODE_PICKER_HEIGHT - ADD_NODE_PICKER_MARGIN
  const preferredTop = anchorRect ? anchorRect.top : point.clientY - 24
  const preferredRight = anchorRect ? anchorRect.right + ADD_NODE_PICKER_MARGIN : point.clientX + ADD_NODE_PICKER_MARGIN
  const preferredLeft = anchorRect ? anchorRect.left - ADD_NODE_PICKER_COLUMN_WIDTH - ADD_NODE_PICKER_MARGIN : point.clientX - ADD_NODE_PICKER_COLUMN_WIDTH - ADD_NODE_PICKER_MARGIN
  const left =
    secondarySide === 'right'
      ? clamp(preferredRight, rightPrimaryMin, rightPrimaryMax)
      : clamp(preferredLeft, leftPrimaryMin, leftPrimaryMax)

  return {
    left,
    top: clamp(preferredTop, ADD_NODE_PICKER_MARGIN, bottomAlignedTop),
    secondarySide,
  }
}

function closeAddNodePicker() {
  addNodePickerOverlay.value = null
}

function isAgentConfigHandle(handle: string | null | undefined): handle is 'chatModel' | 'memory' | 'tool' {
  return AGENT_CONFIG_HANDLES.includes(handle as 'chatModel' | 'memory' | 'tool')
}

const quickAddBus = useEventBus('node:quick-add')
quickAddBus.on((payload: {
  sourceId?: string
  sourceHandle?: string
  targetId?: string
  targetHandle?: string
  agentConfigHandle?: 'chatModel' | 'memory' | 'tool'
  clientX?: number
  clientY?: number
  anchorRect?: AddNodePickerAnchorRect
}) => {
  quickAddSourceHandle = payload.sourceHandle ?? null
  quickAddTargetId = payload.targetId ?? null
  quickAddTargetHandle = payload.targetHandle ?? null
  quickAddAgentConfigHandle = payload.agentConfigHandle ?? null
  openAddNodePanel(payload.sourceId, payload.agentConfigHandle, payload)
})

// ── Insert node between two connected nodes (edge toolbar quick-add) ──────────

let pendingInsertEdgeId: string | null = null
let pendingInsertSourceId: string | null = null
let pendingInsertTargetId: string | null = null
let pendingInsertTargetHandle: string | null = null

const quickAddBetweenBus = useEventBus('edge:quick-add-between')
quickAddBetweenBus.on((payload: {
  edgeId: string
  sourceId: string
  targetId: string
  sourceHandle?: string
  targetHandle?: string
  clientX?: number
  clientY?: number
  anchorRect?: AddNodePickerAnchorRect
}) => {
  pendingInsertEdgeId       = payload.edgeId
  pendingInsertSourceId     = payload.sourceId
  pendingInsertTargetId     = payload.targetId
  pendingInsertTargetHandle = payload.targetHandle ?? null
  quickAddSourceHandle      = payload.sourceHandle ?? null
  quickAddTargetId          = null
  quickAddTargetHandle      = null
  quickAddAgentConfigHandle = null
  openAddNodePanel(payload.sourceId, null, payload)
})

// ── Update edge label from toolbar ────────────────────────────────────────────

const edgeLabelBus = useEventBus('edge:update-label')
edgeLabelBus.on((payload: { edgeId: string; label: string }) => {
  if (!workflowStore.activeWorkflow) return
  const edge = workflowStore.activeWorkflow.edges.find((e) => e.id === payload.edgeId)
  if (edge) edge.label = payload.label || undefined
  const vfEdge = vueFlowEdges.value.find((e) => e.id === payload.edgeId)
  if (vfEdge) (vfEdge as any).label = payload.label || undefined
})

const openAddNodePanel = (
  sourceId?: string | null,
  agentConfigHandle?: 'chatModel' | 'memory' | 'tool' | null,
  anchor?: AddNodePickerAnchor | null,
) => {
  quickAddSourceId = sourceId || null
  quickAddAgentConfigHandle = agentConfigHandle ?? null
  const position = getAddNodePickerPosition(anchor)

  addNodePickerOverlay.value = {
    ...position,
    agentConfigHandle: quickAddAgentConfigHandle,
  }
}

const openAddNodePanelFromEvent = (
  event: MouseEvent,
  sourceId?: string | null,
  agentConfigHandle?: 'chatModel' | 'memory' | 'tool' | null,
) => {
  const anchorRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  openAddNodePanel(sourceId, agentConfigHandle, {
    clientX: event.clientX,
    clientY: event.clientY,
    anchorRect,
  })
}

// ── Run / Stop ────────────────────────────────────────────────────────────

async function handleRun() {
  if (!workflowStore.activeWorkflow) return
  await executionStore.execute(workflowStore.activeWorkflow.metadata.id, {})
}

async function handleStop() {
  await executionStore.cancel()
}

function zoomCanvasIn() {
  return vueFlowStore.value?.zoomIn({ duration: 300 })
}

function zoomCanvasOut() {
  return vueFlowStore.value?.zoomOut({ duration: 300 })
}

function resetCanvasZoom() {
  return vueFlowStore.value?.zoomTo(1, { duration: 300 })
}

function fitWorkflowView() {
  return vueFlowStore.value?.fitView({ duration: 300, padding: 0.2 })
}

async function selectAllNodes() {
  const instance = vueFlowStore.value
  if (!instance) return
  instance.removeSelectedElements()
  instance.addSelectedNodes(instance.getNodes)
}

function clearSelection() {
  vueFlowStore.value?.removeSelectedElements()
}

function getSelectedNodeIds() {
  return vueFlowStore.value?.getSelectedNodes.map((node) => node.id) ?? []
}

async function deleteSelection() {
  if (!workflowStore.activeWorkflow) return
  const result = deleteWorkflowSelection(workflowStore.activeWorkflow, getSelectedNodeIds())
  if (result.nodeIds.length === 0) return

  clearSelection()
  await replaceGraphFromStore()
}

async function duplicateSelection() {
  if (!workflowStore.activeWorkflow) return
  const instance = vueFlowStore.value
  const result = duplicateWorkflowSelection(workflowStore.activeWorkflow, getSelectedNodeIds())
  if (result.nodeIds.length === 0) return

  await replaceGraphFromStore()
  await nextTick()
  const duplicatedNodes = result.nodeIds
    .map((id) => instance?.findNode(id))
    .filter((node): node is NonNullable<typeof node> => !!node)

  instance?.removeSelectedElements()
  if (duplicatedNodes.length > 0) instance?.addSelectedNodes(duplicatedNodes)
}

// Friendly default name per node type (shown in the node header before the user renames it)
const NODE_DEFAULT_NAMES: Partial<Record<WorkflowNodeType, string>> = {
  trigger: 'Trigger',
  code: 'Code Block',
  if: 'Conditional',
  loop: 'Loop / ForEach',
  subworkflow: 'Sub-Workflow',
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
}

const AGENT_CONFIG_TOOLS_PER_ROW = 4
const AGENT_CONFIG_LAYOUT = {
  chatModelX: -165,
  memoryX: 0,
  toolsStartX: 165,
  firstRowY: 265,
  columnGap: 165,
  rowGap: 185,
}

function getNewNodePosition(sourceId: string | null): { x: number; y: number } {
  if (sourceId) {
    const nodes = vueFlowNodes.value as any[]
    const sourceNode = nodes.find((n) => n.id === sourceId)
    if (sourceNode) {
      // Posição x: 300px para a direita. O Y vamos apenas herdar e o alignNodeCenters corrige depois
      const sourceWidth = vueFlowStore.value?.findNode(sourceId)?.dimensions?.width ?? 100
      return { x: sourceNode.position.x + sourceWidth + 200, y: sourceNode.position.y }
    }
  }
  return getCenterPosition()
}

function getIncomingNodePosition(targetId: string | null): { x: number; y: number } {
  if (targetId) {
    const targetNode = (vueFlowNodes.value as any[]).find((n) => n.id === targetId)
    if (targetNode) return { x: targetNode.position.x - 300, y: targetNode.position.y }
  }

  return getCenterPosition()
}

function hasNodeOutgoingConnection(nodeId: string): boolean {
  return (
    vueFlowEdges.value.some((edge) => edge.source === nodeId) ||
    (workflowStore.activeWorkflow?.edges.some((edge) => edge.source === nodeId) ?? false)
  )
}

function getAgentConfigNodePosition(targetId: string | null, targetHandle: string | null): { x: number; y: number } {
  if (!targetId) return getCenterPosition()

  const targetNode = (vueFlowNodes.value as any[]).find((n) => n.id === targetId)
  if (!targetNode) return getCenterPosition()

  const toolIndex =
    targetHandle === 'tool'
      ? workflowStore.activeWorkflow?.edges.filter((edge) =>
        edge.target === targetId && edge.targetHandle === 'tool',
      ).length ?? 0
      : 0

  return getAgentConfigLayoutPosition(targetNode.position, targetHandle, toolIndex)
}

function getAgentConfigLayoutPosition(
  agentPosition: { x: number; y: number },
  targetHandle: string | null,
  toolIndex = 0,
): { x: number; y: number } {
  if (targetHandle === 'chatModel') {
    return {
      x: agentPosition.x + AGENT_CONFIG_LAYOUT.chatModelX,
      y: agentPosition.y + AGENT_CONFIG_LAYOUT.firstRowY,
    }
  }

  if (targetHandle === 'memory') {
    return {
      x: agentPosition.x + AGENT_CONFIG_LAYOUT.memoryX,
      y: agentPosition.y + AGENT_CONFIG_LAYOUT.firstRowY,
    }
  }

  const col = toolIndex % AGENT_CONFIG_TOOLS_PER_ROW
  const row = Math.floor(toolIndex / AGENT_CONFIG_TOOLS_PER_ROW)

  return {
    x: agentPosition.x + AGENT_CONFIG_LAYOUT.toolsStartX + col * AGENT_CONFIG_LAYOUT.columnGap,
    y: agentPosition.y + AGENT_CONFIG_LAYOUT.firstRowY + row * AGENT_CONFIG_LAYOUT.rowGap,
  }
}

function applyNodePosition(nodeId: string, position: { x: number; y: number }) {
  vueFlowStore.value?.updateNode(nodeId, { position })

  const vNode = (vueFlowNodes.value as any[]).find((n) => n.id === nodeId)
  if (vNode) vNode.position = position

  const storeNode = workflowStore.activeWorkflow?.nodes[nodeId]
  if (!storeNode) return

  const ui = { ...(storeNode.ui ?? {}), positionX: position.x, positionY: position.y }
  storeNode.ui = ui
  workflowStore.updateNodeData(nodeId, { ui })
}

function arrangeAgentConfigNodes(targetId: string) {
  if (!workflowStore.activeWorkflow) return

  const targetNode = (vueFlowNodes.value as any[]).find((n) => n.id === targetId)
  if (!targetNode) return

  for (const targetHandle of ['chatModel', 'memory']) {
    const edge = workflowStore.activeWorkflow.edges.find((candidate) =>
      candidate.target === targetId && candidate.targetHandle === targetHandle,
    )
    if (!edge) continue

    applyNodePosition(edge.source, getAgentConfigLayoutPosition(targetNode.position, targetHandle))
  }

  const toolEdges = workflowStore.activeWorkflow.edges.filter((edge) =>
    edge.target === targetId && edge.targetHandle === 'tool',
  )

  toolEdges.forEach((edge, toolIndex) => {
    applyNodePosition(edge.source, getAgentConfigLayoutPosition(targetNode.position, 'tool', toolIndex))
  })
}

function alignNodeCenters(sourceId: string, targetId: string) {
  const checkAndAlign = (attempts = 0) => {
    const instance = vueFlowStore.value
    const sNode = instance?.findNode(sourceId)
    const tNode = instance?.findNode(targetId)

    const sHeight = sNode?.dimensions?.height || 0
    const tHeight = tNode?.dimensions?.height || 0

    if (sHeight > 0 && tHeight > 0) {
      const centerY = sNode!.position.y + sHeight / 2
      const newY = centerY - tHeight / 2

      // Atualiza o Y via VueFlow state
      instance?.updateNode(targetId, { position: { x: tNode!.position.x, y: newY } })

      // Atualiza a prop reativa do VueFlow (array model)
      const vNode = (vueFlowNodes.value as any[]).find((n) => n.id === targetId)
      if (vNode) vNode.position.y = newY

      // Atualiza a store
      if (workflowStore.activeWorkflow?.nodes[targetId]) {
        workflowStore.activeWorkflow.nodes[targetId].ui!.positionY = newY
        workflowStore.updateNodeData(targetId, {
          ui: { ...workflowStore.activeWorkflow.nodes[targetId].ui, positionY: newY },
        })
      }
    } else if (attempts < 30) {
      setTimeout(() => checkAndAlign(attempts + 1), 30)
    }
  }

  checkAndAlign()
}

function autoConnectToSource(sourceId: string, targetId: string, sourceHandle?: string | null) {
  if (!workflowStore.activeWorkflow) return

  const newEdge = {
    id: `e-${sourceId}-${targetId}-${Date.now()}`,
    source: sourceId,
    target: targetId,
    sourceHandle: sourceHandle ?? 'source',
    targetHandle: 'target',
  }

  workflowStore.activeWorkflow.edges.push(newEdge)
  vueFlowEdges.value.push({ ...newEdge, type: 'workflow-edge' })
}

function autoConnectToTarget(sourceId: string, targetId: string, targetHandle?: string | null) {
  if (!workflowStore.activeWorkflow) return

  const newEdge = {
    id: `e-${sourceId}-${targetId}-${Date.now()}`,
    source: sourceId,
    target: targetId,
    sourceHandle: 'source',
    targetHandle: targetHandle ?? 'target',
  }

  workflowStore.activeWorkflow.edges.push(newEdge)
  vueFlowEdges.value.push({ ...newEdge, type: 'workflow-edge' })
}

function connectAgentConfigNode(sourceId: string, targetId: string, targetHandle: string) {
  if (!workflowStore.activeWorkflow) return

  const newEdge = {
    id: `e-${sourceId}-${targetId}-${targetHandle}-${Date.now()}`,
    source: sourceId,
    target: targetId,
    sourceHandle: 'source',
    targetHandle: targetHandle,
  }

  workflowStore.activeWorkflow.edges.push(newEdge)
  vueFlowEdges.value.push({ ...newEdge, type: 'workflow-edge' })
  arrangeAgentConfigNodes(targetId)
}

function insertNodeBetween(
  edgeId: string,
  newNodeId: string,
  oldSourceId: string,
  oldTargetId: string,
  oldTargetHandle: string | null,
) {
  if (!workflowStore.activeWorkflow) return
  const instance = vueFlowStore.value
  if (!instance) return

  // 1. Capture positions NOW (before any mutations) from known nodes
  const sourceNode    = instance.findNode(oldSourceId)
  const oldTargetNode = instance.findNode(oldTargetId)

  const sx   = sourceNode?.position.x    ?? 0
  const sy   = sourceNode?.position.y    ?? 0
  const tx   = oldTargetNode?.position.x ?? sx + 600
  const midX = Math.round((sx + tx) / 2)
  const midY = sy

  // 2. Delete the old edge (source → oldTarget)
  const storeEdgeIdx = workflowStore.activeWorkflow.edges.findIndex((e) => e.id === edgeId)
  if (storeEdgeIdx !== -1) workflowStore.activeWorkflow.edges.splice(storeEdgeIdx, 1)
  const vfEdgeIdx = vueFlowEdges.value.findIndex((e) => e.id === edgeId)
  if (vfEdgeIdx !== -1) vueFlowEdges.value.splice(vfEdgeIdx, 1)

  // 3. Add edge: newNode → oldTarget (always use 'target' handle to match the standard)
  const newEdge2 = {
    id: `e-${newNodeId}-${oldTargetId}-${Date.now()}`,
    source: newNodeId,
    target: oldTargetId,
    sourceHandle: 'source',
    targetHandle: 'target',
  }
  workflowStore.activeWorkflow.edges.push(newEdge2)
  vueFlowEdges.value.push({ ...newEdge2, type: 'workflow-edge' })

  // 4. Defer position updates — new node isn't in VueFlow's internal store yet
  const MIN_GAP = 240

  setTimeout(() => {
    if (!workflowStore.activeWorkflow) return

    // Place new node at midpoint
    instance.updateNode(newNodeId, { position: { x: midX, y: midY } })
    const storeNewNode = workflowStore.activeWorkflow.nodes[newNodeId]
    if (storeNewNode) {
      storeNewNode.ui = { ...(storeNewNode.ui ?? { positionX: midX, positionY: midY }), positionX: midX, positionY: midY }
    }

    // Push source (and everything to its left) leftward
    const leftGap = midX - sx
    if (leftGap < MIN_GAP) {
      const pushLeft = MIN_GAP - leftGap
      for (const n of instance.getNodes) {
        if (n.id === newNodeId) continue
        if (n.position.x <= sx + 1) {
          const nx = n.position.x - pushLeft
          instance.updateNode(n.id, { position: { x: nx, y: n.position.y } })
          const sn = workflowStore.activeWorkflow?.nodes[n.id]
          if (sn) sn.ui = { positionX: nx, positionY: sn.ui?.positionY ?? n.position.y }
        }
      }
    }

    // Push oldTarget (and everything to its right) rightward
    const rightGap = tx - midX
    if (rightGap < MIN_GAP) {
      const pushRight = MIN_GAP - rightGap
      for (const n of instance.getNodes) {
        if (n.id === newNodeId) continue
        if (n.position.x >= tx - 1) {
          const nx = n.position.x + pushRight
          instance.updateNode(n.id, { position: { x: nx, y: n.position.y } })
          const sn = workflowStore.activeWorkflow?.nodes[n.id]
          if (sn) sn.ui = { positionX: nx, positionY: sn.ui?.positionY ?? n.position.y }
        }
      }
    }

    // Align new node vertically with source
    alignNodeCenters(oldSourceId, newNodeId)
    alignNodeCenters(newNodeId, oldTargetId)
  }, 50)
}

const generateNodeId = (prefix: string) => {
  if (!workflowStore.activeWorkflow) return `${prefix}_1`

  const nodes = workflowStore.activeWorkflow.nodes
  // Triggers start at 0 (trigger_0), all other node types start at 1
  let counter = prefix === 'trigger' ? 0 : 1
  let newId = `${prefix}_${counter}`

  // Safe check against both store and current VueFlow nodes
  while (nodes[newId] || vueFlowNodes.value.some((n) => n.id === newId)) {
    counter++
    newId = `${prefix}_${counter}`
  }

  return newId
}

const addLogicNode = (type: WorkflowNodeType, providedDefaults: Record<string, unknown> = {}) => {
  if (!workflowStore.activeWorkflow) return

  const backupSourceId = quickAddSourceId
  const backupSourceHandle = quickAddSourceHandle
  const backupTargetId = quickAddTargetId
  const backupTargetHandle = quickAddTargetHandle
  quickAddSourceId = null
  quickAddSourceHandle = null
  quickAddTargetId = null
  quickAddTargetHandle = null
  quickAddAgentConfigHandle = null

  const id = generateNodeId(type)
  const backupAgentConfigHandle = isAgentConfigHandle(backupTargetHandle) ? backupTargetHandle : null
  const isAgentConfigTarget = Boolean(backupTargetId && backupAgentConfigHandle)
  let pos = getNewNodePosition(backupSourceId)
  if (isAgentConfigTarget) {
    pos = getAgentConfigNodePosition(backupTargetId, backupAgentConfigHandle)
  } else if (backupTargetId) {
    pos = getIncomingNodePosition(backupTargetId)
  }
  const shouldAdoptLegacyTrigger =
    type === 'trigger' &&
    !Object.values(workflowStore.activeWorkflow.nodes).some((nodeData) => nodeData.type === 'trigger')

  // Default properties required by backend validation
  const defaultData: Record<string, any> = {}
  if (type === 'http') {
    defaultData.url = 'https://api.example.com'
    defaultData.method = 'GET'
  } else if (type === 'code') {
    defaultData.script = 'return { status: "ok" };'
  } else if (type === 'if') {
    defaultData.condition = 'true'
  } else if (type === 'loop') {
    defaultData.collection = '[]'
  } else if (type === 'subworkflow') {
    defaultData.workflowId = 'placeholder'
  } else if (type === 'event' || type === 'event-listener') {
    defaultData.eventName = 'my-event'
    if (type === 'event') defaultData.payloadParams = []
  } else if (type === 'set') {
    defaultData.assignments = [{ key: 'field', value: '' }]
  } else if (type === 'switch') {
    defaultData.inputExpression = 'steps.prev.output.status'
    defaultData.cases = [
      { value: '200', handleId: 'case_0' },
      { value: '404', handleId: 'case_1' },
    ]
    defaultData.fallbackHandleId = 'fallback'
  } else if (type === 'merge') {
    defaultData.mode = 'wait-any'
  } else if (type === 'split-in-batches') {
    defaultData.collection = 'trigger.body.items'
    defaultData.batchSize = 10
  } else if (type === 'respond-webhook') {
    defaultData.statusCode = 200
    defaultData.body = '{ "ok": true }'
    defaultData.headers = { 'Content-Type': 'application/json' }
  } else if (type === 'wait-form') {
    defaultData.title = 'Temporary Form'
    defaultData.description = ''
    defaultData.publicSlug = 'form-{{ steps.uuid.output }}'
    defaultData.expiresInSeconds = 900
    defaultData.theme = { preset: 'social-media' }
    defaultData.fields = [
      { name: 'email', label: 'Email', type: 'email', required: true },
    ]
  } else if (type === 'ai-agent') {
    defaultData.prompt = 'You are a helpful workflow agent. Use tools only when needed.'
    defaultData.executionMode = 'loop'
    defaultData.maxIterations = 8
    defaultData.maxToolCalls = 12
    defaultData.maxRetriesPerTool = 3
    defaultData.timeoutMs = 180000
    defaultData.requireApprovalForSideEffects = [
      'write',
      'delete',
      'external-message',
      'external-payment',
      'filesystem',
    ]
    defaultData.outputMode = 'text'
    defaultData.providerCount = 0
    defaultData.memoryCount = 0
    defaultData.toolCount = 0
  } else if (type === 'ai-model') {
    defaultData.pluginId = 'openai'
    defaultData.adapter = 'openai-compatible'
    defaultData.model = 'gpt-4.1-mini'
    defaultData.temperature = 0.2
  } else if (type === 'ai-memory') {
    defaultData.scope = 'session'
    defaultData.readEnabled = true
    defaultData.writeEnabled = false
    defaultData.maxRetrievedMemories = 4
    defaultData.maxMemoryChars = 2000
  } else if (type === 'ai-tool') {
    defaultData.pluginId = 'plugin'
    defaultData.methodId = 'method'
    defaultData.timeoutMs = 30000
    defaultData.requiresApproval = true
    defaultData.sideEffect = 'write'
    defaultData.inputDefaults = {}
  } else if (type === 'trigger') {
    defaultData.trigger = shouldAdoptLegacyTrigger
      ? { ...workflowStore.activeWorkflow.trigger, ui: undefined }
      : { type: 'manual' }
  }

  const mergedData = {
    ...defaultData,
    ...providedDefaults,
  }

  const defaultName =
    type === 'trigger' && (mergedData.trigger as any)?.type === 'chat'
      ? 'Chat Trigger'
      : NODE_DEFAULT_NAMES[type] ?? id

  // Adicionar no store
  const newNode: any = {
    type,
    name: defaultName,
    ui: { positionX: pos.x, positionY: pos.y },
    ...mergedData,
  }
  workflowStore.activeWorkflow.nodes[id] = newNode

  if (shouldAdoptLegacyTrigger) {
    workflowStore.activeWorkflow.edges = workflowStore.activeWorkflow.edges.map((edge) =>
      edge.source === 'trigger' ? { ...edge, source: id } : edge,
    )
    vueFlowEdges.value = buildEdges()
  }

  // Adicionar no VueFlow
  vueFlowNodes.value.push({
    id,
    type,
    position: pos,
    data: newNode,
  })

  if (isAgentConfigTarget && backupTargetId && backupAgentConfigHandle) {
    connectAgentConfigNode(id, backupTargetId, backupAgentConfigHandle)
  } else if (backupTargetId) {
    autoConnectToTarget(id, backupTargetId, backupTargetHandle)
    alignNodeCenters(id, backupTargetId)
  } else if (backupSourceId && type !== 'trigger') {
    autoConnectToSource(backupSourceId, id, backupSourceHandle)
    alignNodeCenters(backupSourceId, id)
  }

  // Insert-between: splice new node into an existing edge
  if (pendingInsertEdgeId && pendingInsertSourceId && pendingInsertTargetId) {
    insertNodeBetween(pendingInsertEdgeId, id, pendingInsertSourceId, pendingInsertTargetId, pendingInsertTargetHandle)
    pendingInsertEdgeId = null
    pendingInsertSourceId = null
    pendingInsertTargetId = null
    pendingInsertTargetHandle = null
  }

  closeAddNodePicker()
}

const addPluginNode = (pluginId: string, action: string, actionName: string) => {
  if (!workflowStore.activeWorkflow) return

  const backupSourceId = quickAddSourceId
  const backupSourceHandle = quickAddSourceHandle
  const backupTargetId = quickAddTargetId
  const backupTargetHandle = quickAddTargetHandle
  quickAddSourceId = null
  quickAddSourceHandle = null
  quickAddTargetId = null
  quickAddTargetHandle = null
  quickAddAgentConfigHandle = null

  const id = generateNodeId(action)
  const pos = backupTargetId
    ? getIncomingNodePosition(backupTargetId)
    : getNewNodePosition(backupSourceId)

  const newPluginNode: any = {
    type: 'plugin',
    name: actionName,
    pluginId,
    action,
    params: {},
    ui: { positionX: pos.x, positionY: pos.y },
  }
  workflowStore.activeWorkflow.nodes[id] = newPluginNode

  vueFlowNodes.value.push({
    id,
    type: 'plugin',
    position: pos,
    data: newPluginNode,
  })

  if (backupTargetId) {
    autoConnectToTarget(id, backupTargetId, backupTargetHandle)
    alignNodeCenters(id, backupTargetId)
  } else if (backupSourceId) {
    autoConnectToSource(backupSourceId, id, backupSourceHandle)
    alignNodeCenters(backupSourceId, id)
  }

  // Insert-between: splice new node into an existing edge
  if (pendingInsertEdgeId && pendingInsertSourceId && pendingInsertTargetId) {
    insertNodeBetween(pendingInsertEdgeId, id, pendingInsertSourceId, pendingInsertTargetId, pendingInsertTargetHandle)
    pendingInsertEdgeId = null
    pendingInsertSourceId = null
    pendingInsertTargetId = null
    pendingInsertTargetHandle = null
  }

  closeAddNodePicker()
}

const addAgentToolNode = (pluginId: string, action: string, actionName: string) => {
  addLogicNode('ai-tool' as WorkflowNodeType, {
    name: actionName,
    pluginId,
    methodId: action,
  })
}

const SNAP = 20
const NODE_PADDING = 24 // extra breathing room around each node

/**
 * Returns true if two axis-aligned rectangles overlap (with padding).
 */
function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return (
    ax < bx + bw + NODE_PADDING &&
    ax + aw + NODE_PADDING > bx &&
    ay < by + bh + NODE_PADDING &&
    ay + ah + NODE_PADDING > by
  )
}

/**
 * Resolves an overlap by nudging node A to the nearest non-overlapping
 * snapped position on each axis.
 */
function resolveOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): { x: number; y: number } {
  // Compute overlap depth on each axis
  const overlapRight  = bx + bw + NODE_PADDING - ax
  const overlapLeft   = ax + aw + NODE_PADDING - bx
  const overlapBottom = by + bh + NODE_PADDING - ay
  const overlapTop    = ay + ah + NODE_PADDING - by

  const minX = Math.min(overlapRight, overlapLeft)
  const minY = Math.min(overlapBottom, overlapTop)

  let nx = ax
  let ny = ay

  if (minX <= minY) {
    // Push horizontally
    nx = overlapRight < overlapLeft
      ? Math.round((bx + bw + NODE_PADDING) / SNAP) * SNAP
      : Math.round((bx - aw - NODE_PADDING) / SNAP) * SNAP
  } else {
    // Push vertically
    ny = overlapBottom < overlapTop
      ? Math.round((by + bh + NODE_PADDING) / SNAP) * SNAP
      : Math.round((by - ah - NODE_PADDING) / SNAP) * SNAP
  }

  return { x: nx, y: ny }
}

/**
 * Sincroniza a nova posição de volta pro store quando o drag termina.
 * Também empurra nodes sobrepostos para evitar overlap.
 */
const onNodeDragStop = (event: NodeDragEvent) => {
  const draggedNodes = event.nodes && event.nodes.length > 0 ? event.nodes : [event.node]
  const instance = vueFlowStore.value

  for (const node of draggedNodes) {
    let x = Math.round(node.position.x / SNAP) * SNAP
    let y = Math.round(node.position.y / SNAP) * SNAP

    // ── Avoid node overlap ────────────────────────────────────────────────
    // Dimensions come from the VueFlow internal store (not drag event, which may be 0)
    if (instance) {
      const internalDragged = instance.findNode(node.id)
      const dw = internalDragged?.dimensions?.width  ?? 200
      const dh = internalDragged?.dimensions?.height ?? 80
      const allNodes = instance.getNodes

      let attempts = 0
      let overlapping = true
      while (overlapping && attempts < 20) {
        overlapping = false
        for (const other of allNodes) {
          if (other.id === node.id) continue
          const ow = other.dimensions?.width  ?? 200
          const oh = other.dimensions?.height ?? 80
          if (rectsOverlap(x, y, dw, dh, other.position.x, other.position.y, ow, oh)) {
            const resolved = resolveOverlap(x, y, dw, dh, other.position.x, other.position.y, ow, oh)
            x = resolved.x
            y = resolved.y
            overlapping = true
            break
          }
        }
        attempts++
      }
    }

    // Apply snapped + de-overlapped position back to VueFlow
    if (instance) {
      instance.updateNode(node.id, { position: { x, y } })
      const vNode = (vueFlowNodes.value as any[]).find((n) => n.id === node.id)
      if (vNode) { vNode.position.x = x; vNode.position.y = y }
    }

    workflowStore.updateNodeData(node.id, {
      ui: {
        ...(node.data?.ui ?? {}),
        positionX: x,
        positionY: y,
      },
    })
  }
}

/**
 * Quando uma nova conexão é criada, sincroniza pro store.
 */
type PendingConnectionDrag = {
  nodeId: string
  handleId: string | null
  handleType: string | null
}

let pendingConnectionDrag: PendingConnectionDrag | null = null

function getConnectionDragInfo(args: unknown[]): PendingConnectionDrag | null {
  const params = (args.length > 1 ? args[1] : args[0]) as any
  const event = (args[0] instanceof Event ? args[0] : params?.event) as Event | undefined
  const target = event?.target instanceof Element ? event.target : null
  const handleEl = target?.closest('.vue-flow__handle')

  const nodeId =
    params?.nodeId ??
    params?.node?.id ??
    params?.fromNode?.id ??
    handleEl?.getAttribute('data-nodeid') ??
    handleEl?.getAttribute('data-node-id') ??
    null

  if (!nodeId) return null

  const handleId =
    params?.handleId ??
    params?.handle?.id ??
    handleEl?.getAttribute('data-handleid') ??
    handleEl?.getAttribute('data-handle-id') ??
    null

  const handleType =
    params?.handleType ??
    params?.type ??
    (handleEl?.classList.contains('source') ? 'source' : null) ??
    (handleEl?.classList.contains('target') ? 'target' : null)

  return { nodeId, handleId, handleType }
}

const onConnectStart = (...args: unknown[]) => {
  pendingConnectionDrag = getConnectionDragInfo(args)
}

const onConnectEnd = (...args: unknown[]) => {
  const pending = pendingConnectionDrag
  pendingConnectionDrag = null
  if (!pending) return

  const payload = args[0] as any
  const event = (payload instanceof Event ? payload : payload?.event) as Event | undefined
  const target = event?.target instanceof Element ? event.target : null

  if (!target?.closest('.sailor-workflow-canvas')) return
  if (target.closest('.vue-flow__handle, .vue-flow__node, .vue-flow__edge')) return

  pendingInsertEdgeId = null
  pendingInsertSourceId = null
  pendingInsertTargetId = null
  pendingInsertTargetHandle = null

  if (pending.handleType === 'target') {
    quickAddSourceId = null
    quickAddSourceHandle = null
    quickAddTargetId = pending.nodeId
    quickAddTargetHandle = pending.handleId
    quickAddAgentConfigHandle = isAgentConfigHandle(pending.handleId) ? pending.handleId : null
    openAddNodePanel(null, quickAddAgentConfigHandle, event instanceof MouseEvent ? event : null)
    return
  }

  quickAddSourceHandle = pending.handleId
  quickAddTargetId = null
  quickAddTargetHandle = null
  quickAddAgentConfigHandle = null
  openAddNodePanel(pending.nodeId, null, event instanceof MouseEvent ? event : null)
}

const onConnect = (connection: Connection) => {
  if (!workflowStore.activeWorkflow) return
  pendingConnectionDrag = null

  const newEdge = {
    id: `e-${connection.source}-${connection.target}-${Date.now()}`,
    source: connection.source!,
    target: connection.target!,
    sourceHandle: connection.sourceHandle ?? undefined,
    targetHandle: connection.targetHandle ?? undefined,
  }

  // 1. Persiste no store (pra save funcionar)
  workflowStore.activeWorkflow.edges.push(newEdge)

  // 2. Adiciona no ref do VueFlow (pra aparecer na tela imediatamente)
  //    Com v-model:edges, o VueFlow NÃO adiciona automaticamente ao @connect.
  vueFlowEdges.value.push({ ...newEdge, type: 'workflow-edge' })

  if (newEdge.targetHandle && ['chatModel', 'memory', 'tool'].includes(newEdge.targetHandle)) {
    arrangeAgentConfigNodes(newEdge.target)
  }
}

type EdgeChange = { type: string; id?: string }
const onEdgesChange = (changes: EdgeChange[]) => {
  if (isApplyingGraphSnapshot.value) return

  const removals = changes.filter((c) => c.type === 'remove')
  if (removals.length && workflowStore.activeWorkflow) {
    const removedIds = new Set(removals.map((c) => c.id))
    workflowStore.activeWorkflow.edges = workflowStore.activeWorkflow.edges.filter(
      (e) => !removedIds.has(e.id),
    )
  }
}

type NodeChange = { type: string; id?: string }
const onNodesChange = (changes: NodeChange[]) => {
  if (isApplyingGraphSnapshot.value) return

  const removals = changes.filter((c) => c.type === 'remove')
  if (removals.length && workflowStore.activeWorkflow) {
    let changed = false
    for (const c of removals) {
      if (c.id && workflowStore.activeWorkflow.nodes[c.id]) {
        delete workflowStore.activeWorkflow.nodes[c.id]
        changed = true
      }
    }
  }
}

// ── Expose public API so WorkflowEditorPage can call these ────────────────
defineExpose({
  handleRun,
  handleStop,
  openAddNodePanel,
  selectAllNodes,
  clearSelection,
  duplicateSelection,
  deleteSelection,
  zoomIn: zoomCanvasIn,
  zoomOut: zoomCanvasOut,
  zoomReset: resetCanvasZoom,
  fitWorkflowView,
})
</script>

<template>
  <!-- O contêiner pai deve sempre ter uma altura/largura definida para o VueFlow renderizar -->
  <div class="sailor-workflow-canvas sailor-fill">
    <VueFlow
      :id="workflowStore.activeWorkflow?.metadata.id ?? 'default'"
      v-model:nodes="vueFlowNodes"
      v-model:edges="vueFlowEdges"
      :default-zoom="1"
      :min-zoom="0.5"
      :max-zoom="1.5"
      fit-view-on-init
      :snap-to-grid="true"
      :snap-grid="[20, 20]"
      :delete-key-code="['Delete']"
      @node-double-click="onNodeDoubleClick"
      @node-drag-stop="onNodeDragStop"
      @connect-start="onConnectStart"
      @connect="onConnect"
      @connect-end="onConnectEnd"
      @init="onVueFlowInit"
      @edges-change="onEdgesChange"
      @nodes-change="onNodesChange"
      @selection-drag-start="isCanvasSelecting = true"
      @selection-drag-stop="isCanvasSelecting = false"
      @pane-click="isCanvasSelecting = false"
    >
      <!-- Execution Logs floating panel — centered above the canvas -->
      <!-- MARCADORES SVG CUSTOMIZADOS ATRELADOS ÀS VARIÁVEIS CSS (GLOBAL DOM) -->
      <svg style="position: absolute; width: 0; height: 0" aria-hidden="true">
        <defs>
          <marker
            id="sailor-arrow-idle"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              fill="var(--sailor-rf-arrow-stroke)"
              stroke="var(--sailor-rf-arrow-stroke)"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </marker>
          <marker
            id="sailor-arrow-success"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              fill="var(--sailor-green-500, #22c55e)"
              stroke="var(--sailor-green-500, #22c55e)"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </marker>
          <marker
            id="sailor-arrow-failed"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              fill="var(--sailor-red-500, #ef4444)"
              stroke="var(--sailor-red-500, #ef4444)"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </marker>
          <marker
            id="sailor-arrow-running"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              fill="var(--sailor-amber-500, #f59e0b)"
              stroke="var(--sailor-amber-500, #f59e0b)"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </marker>
          <marker
            id="sailor-arrow-selected"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              fill="var(--sailor-rf-arrow-stroke-selected)"
              stroke="var(--sailor-rf-arrow-stroke-selected)"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </marker>
        </defs>
      </svg>

      <!-- Canvas Background -->
      <Background
        :gap="20"
        :size="1"
        :variant="'dots'"
        :color="'var(--sailor-canvas-grid)'"
        :style="{ 'background-color': 'var(--sailor-canvas-bg)' }"
      />

      <button
        v-if="isWorkflowEmpty"
        class="canvas-empty-step nodrag nopan"
        type="button"
        @click.stop="(event) => openAddNodePanelFromEvent(event, null, null)"
      >
        <span class="canvas-empty-step__box">
          <LucideIcon name="plus" :size="34" />
        </span>
        <span class="canvas-empty-step__label">Add first step...</span>
      </button>

      <!-- Custom Edge (Contains trash toolbar etc) -->
      <template #edge-workflow-edge="edgeProps">
        <BaseEdge v-bind="edgeProps" />
      </template>

      <!-- Multi-selection bounding box -->
      <NodeGroupSelectionBox
        :on-duplicate-selection="duplicateSelection"
        :on-delete-selection="deleteSelection"
      />

      <!-- Trigger Node -->
      <template #node-trigger="nodeProps">
        <TriggerNode v-bind="nodeProps" />
      </template>

      <!-- HTTP Node -->
      <template #node-http="nodeProps">
        <HttpNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- CODE Node -->
      <template #node-code="nodeProps">
        <CodeNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- LOOP Node -->
      <template #node-loop="nodeProps">
        <LoopNode v-bind="nodeProps" />
      </template>

      <!-- EVENT Node -->
      <template #node-event="nodeProps">
        <EventNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- PLUGIN Node -->
      <template #node-plugin="nodeProps">
        <PluginNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- EVENT LISTENER Node -->
      <template #node-event-listener="nodeProps">
        <EventListenerNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- SUBWORKFLOW Node -->
      <template #node-subworkflow="nodeProps">
        <SubWorkflowNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- IF Node -->
      <template #node-if="nodeProps">
        <IfNode v-bind="nodeProps" />
      </template>

      <!-- SET Node -->
      <template #node-set="nodeProps">
        <SetNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- SWITCH Node -->
      <template #node-switch="nodeProps">
        <SwitchNode v-bind="nodeProps" />
      </template>

      <!-- MERGE Node -->
      <template #node-merge="nodeProps">
        <MergeNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- SPLIT IN BATCHES Node -->
      <template #node-split-in-batches="nodeProps">
        <SplitInBatchesNode v-bind="nodeProps" />
      </template>

      <!-- RESPOND TO WEBHOOK Node -->
      <template #node-respond-webhook="nodeProps">
        <RespondToWebhookNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- WAIT FORM Node -->
      <template #node-wait-form="nodeProps">
        <WaitFormNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- TEXT DATASET Node -->
      <template #node-text-dataset="nodeProps">
        <TextDatasetNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- FILE DATASET Node -->
      <template #node-file-dataset="nodeProps">
        <FileDatasetNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- DATABASE DATASET Node -->
      <template #node-database-dataset="nodeProps">
        <DatabaseDatasetNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- EMBEDDINGS Node -->
      <template #node-embeddings="nodeProps">
        <EmbeddingsNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- VECTOR STORE Node -->
      <template #node-vector-store="nodeProps">
        <VectorStoreNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- RETRIEVER Node -->
      <template #node-retriever="nodeProps">
        <RetrieverNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- AI AGENT Node -->
      <template #node-ai-agent="nodeProps">
        <AiAgentNode v-bind="nodeProps" :has-outgoing-connection="hasNodeOutgoingConnection(nodeProps.id)" />
      </template>

      <!-- AI MODEL Node -->
      <template #node-ai-model="nodeProps">
        <AiModelNode v-bind="nodeProps" />
      </template>

      <!-- AI MEMORY Node -->
      <template #node-ai-memory="nodeProps">
        <AiMemoryNode v-bind="nodeProps" />
      </template>

      <!-- AI TOOL Node -->
      <template #node-ai-tool="nodeProps">
        <AiToolNode v-bind="nodeProps" />
      </template>
    </VueFlow>

    <div
      v-if="addNodePickerOverlay"
      class="add-node-picker-overlay nodrag nopan"
      @pointerdown.self="closeAddNodePicker"
    >
      <div
        class="add-node-picker-overlay__window"
        :style="addNodePickerStyle"
        @click.stop
        @pointerdown.stop
      >
        <AddNodePanel
          :on-add-logic-node="addLogicNode"
          :on-add-plugin-node="addPluginNode"
          :on-add-agent-tool-node="addAgentToolNode"
          :agent-config-handle="addNodePickerOverlay.agentConfigHandle ?? undefined"
          :secondary-side="addNodePickerOverlay.secondarySide"
        />
      </div>
    </div>

    <!-- Node Inspector Immersive Modal -->
    <NodeInspectorModal />
  </div>
</template>

<style scoped>
.sailor-workflow-canvas {
  width: 100%;
  height: 100%;
}

.add-node-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  pointer-events: auto;
}

.add-node-picker-overlay__window {
  position: fixed;
}

.canvas-empty-step {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  color: var(--sailor-text-primary);
  background: transparent;
  border: 0;
  transform: translate(-50%, -50%);
  cursor: pointer;
}

.canvas-empty-step__box {
  width: 82px;
  height: 82px;
  display: grid;
  place-items: center;
  color: var(--sailor-text-muted);
  background: color-mix(in srgb, var(--sailor-bg-surface) 70%, transparent);
  border: 2px dashed var(--sailor-border-strong);
  border-radius: 8px;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.canvas-empty-step__label {
  font-size: 13px;
  line-height: 1.2;
  color: var(--sailor-text-primary);
  white-space: nowrap;
}

.canvas-empty-step:hover .canvas-empty-step__box {
  color: var(--sailor-text-primary);
  background: var(--sailor-bg-surface-hover);
  border-color: var(--sailor-text-primary);
}

.canvas-empty-step:focus-visible .canvas-empty-step__box {
  outline: 2px solid var(--sailor-node-selected);
  outline-offset: 3px;
}

/*
  Execution logs overlay — floats centered at the top of the canvas.
  pointer-events: none on the wrapper is intentional: the wrapper div stays
  at its original DOM position even after the panel is dragged via transform.
  With pointer-events: auto the ghost bounding-box would block clicks in the
  area the panel moved away from. The .elp-panel itself has @click.stop and
  @mousedown.stop, so it captures its own events correctly without the wrapper.
*/
.canvas-logs-overlay {
  position: absolute;
  top: 48px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  z-index: 60;
  pointer-events: none;
}

/* 
  Estilo da caixa de seleção (Shift + Drag).
  Como removemos o theme-default.css no main.ts para evitar bordas brancas indesejadas
  nos nodes, precisamos re-declarar o estilo nativo da marquee de seleção aqui, com a cor da marca.
*/
:deep(.vue-flow__selectionpane),
:deep(.vue-flow__selection) {
  background-color: rgba(124, 58, 237, 0.1) !important;
  border: 1px solid var(--sailor-brand-500) !important;
  border-radius: var(--sailor-radius-sm);
  z-index: 1000;
}
</style>
