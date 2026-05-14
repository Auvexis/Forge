<script setup lang="ts">
import { ref, watch, markRaw, computed, onBeforeUnmount, nextTick } from 'vue'
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
import BaseEdge from './BaseEdge.vue'
import NodeGroupSelectionBox from './NodeGroupSelectionBox.vue'
import { Background } from '@vue-flow/background'

import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import { useNodeInspectorStore } from '../stores/node-inspector.store'
import NodeInspectorModal from './settings/NodeInspectorModal.vue'
import AddNodePanel from './settings/AddNodePanel.vue'
import RunWorkflowPanel from './execution/RunWorkflowPanel.vue'
import ExecutionLogsPanel from './execution/ExecutionLogsPanel.vue'
import type { WorkflowNodeType, WorkflowNode } from '@/core/types/workflow.types'
import { useEventBus } from '@/shared/composables/useEventBus'
import { useToast } from '@/shared/composables/useToast'
import { isCanvasSelecting } from '../composables/useCanvasSelecting'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import {
  deleteWorkflowSelection,
  duplicateWorkflowSelection,
} from '../utils/workflowSelectionActions'
import { selectToolbarRunTrigger, shouldRenderLegacyTriggerNode } from '../utils/workflowRunTrigger'

// Stores
const workflowStore = useWorkflowStore()
const panelStore = useAppPanelStore()
const inspectorStore = useNodeInspectorStore()
const executionStore = useExecutionStore()
const toast = useToast()
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
  const canvas = document.querySelector('.nod8-workflow-canvas') as HTMLElement | null
  const bounds = canvas?.getBoundingClientRect()
  const screenCenter = {
    x: (bounds?.left ?? 0) + (bounds?.width ?? window.innerWidth) / 2,
    y: (bounds?.top ?? 0) + (bounds?.height ?? window.innerHeight) / 2,
  }

  return vueFlowStore.value?.screenToFlowCoordinate(screenCenter) ?? screenCenter
}

let quickAddSourceId: string | null = null
let quickAddSourceHandle: string | null = null

const quickAddBus = useEventBus('node:quick-add')
quickAddBus.on((payload: { sourceId: string; sourceHandle?: string }) => {
  quickAddSourceHandle = payload.sourceHandle ?? null
  openAddNodePanel(payload.sourceId)
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
}) => {
  pendingInsertEdgeId       = payload.edgeId
  pendingInsertSourceId     = payload.sourceId
  pendingInsertTargetId     = payload.targetId
  pendingInsertTargetHandle = payload.targetHandle ?? null
  quickAddSourceHandle      = payload.sourceHandle ?? null
  openAddNodePanel(payload.sourceId)
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

const openAddNodePanel = (sourceId?: string | null) => {
  quickAddSourceId = sourceId || null

  panelStore.togglePanel({
    id: 'add-node-panel',
    title: 'Add Node',
    component: markRaw(AddNodePanel),
    props: {
      onAddLogicNode: addLogicNode,
      onAddPluginNode: addPluginNode,
    },
    position: 'right',
    width: 'md',
  })
}

// ── Run / Stop ────────────────────────────────────────────────────────────

/**
 * Smart run: if the trigger has manual input fields, opens RunWorkflowPanel
 * so the user can fill them in. Otherwise executes immediately.
 */
async function handleRun() {
  if (!workflowStore.activeWorkflow) return

  const runTrigger = selectToolbarRunTrigger(workflowStore.activeWorkflow)
  if (!runTrigger) {
    toast.warning('Add or enable a Manual trigger to run from the toolbar.')
    return
  }

  const { triggerNodeId, trigger } = runTrigger
  const schema = trigger.schema ?? {}

  if (trigger.type === 'form') {
    // Generate a client-side executionId, start streaming, then open the form
    // in a new tab. The form page reads ?execId from the URL and forwards it
    // as X-Nod8-Execution-Id so the server ties that submission to this stream.
    const formPublicId = trigger.formSlug?.trim() || workflowStore.activeWorkflow.metadata.id
    const clientExecId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    executionStore.resetNodeStatuses()
    executionStore.startStream(clientExecId)
    executionStore.setTriggerRunning(triggerNodeId)   // shimmer laranja no trigger enquanto aguarda o form

    const formUrl = `${window.location.origin}/forms-test/${formPublicId}?execId=${clientExecId}`
    window.open(formUrl, '_blank', 'noopener')
    return
  } else if (Object.keys(schema).length > 0) {
    panelStore.togglePanel({
      id: 'run-workflow-panel',
      title: 'Run Workflow',
      component: markRaw(RunWorkflowPanel),
      props: {
        workflowId: workflowStore.activeWorkflow.metadata.id,
        schema,
        triggerType: trigger.type,
        triggerNodeId,
      },
      position: 'right',
      width: 'md',
    })
  } else {
    await executionStore.execute(workflowStore.activeWorkflow.metadata.id, {}, triggerNodeId)
  }
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
}

function getNewNodePosition(sourceId: string | null): { x: number; y: number } {
  if (sourceId) {
    const nodes = vueFlowNodes.value as any[]
    const sourceNode = nodes.find((n) => n.id === sourceId)
    if (sourceNode) {
      // Posição x: 300px para a direita. O Y vamos apenas herdar e o alignNodeCenters corrige depois
      return { x: sourceNode.position.x + 300, y: sourceNode.position.y }
    }
  }
  return getCenterPosition()
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

const addLogicNode = (type: WorkflowNodeType) => {
  if (!workflowStore.activeWorkflow) return

  const backupSourceId = quickAddSourceId
  const backupSourceHandle = quickAddSourceHandle
  quickAddSourceId = null
  quickAddSourceHandle = null

  const id = generateNodeId(type)
  const pos = getNewNodePosition(backupSourceId)
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
  } else if (type === 'trigger') {
    defaultData.trigger = shouldAdoptLegacyTrigger
      ? { ...workflowStore.activeWorkflow.trigger, ui: undefined }
      : { type: 'manual' }
  }

  // Adicionar no store
  const newNode: any = {
    type,
    name: NODE_DEFAULT_NAMES[type] ?? id,
    ui: { positionX: pos.x, positionY: pos.y },
    ...defaultData,
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

  if (backupSourceId && type !== 'trigger') {
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

  panelStore.closePanel()
}

const addPluginNode = (pluginId: string, action: string, actionName: string) => {
  if (!workflowStore.activeWorkflow) return

  const backupSourceId = quickAddSourceId
  const backupSourceHandle = quickAddSourceHandle
  quickAddSourceId = null
  quickAddSourceHandle = null

  const id = generateNodeId(action)
  const pos = getNewNodePosition(backupSourceId)

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

  if (backupSourceId) {
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

  panelStore.closePanel()
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
const onConnect = (connection: Connection) => {
  if (!workflowStore.activeWorkflow) return

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
  <div class="nod8-workflow-canvas nod8-fill">
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
      @connect="onConnect"
      @init="onVueFlowInit"
      @edges-change="onEdgesChange"
      @nodes-change="onNodesChange"
      @selection-drag-start="isCanvasSelecting = true"
      @selection-drag-stop="isCanvasSelecting = false"
      @pane-click="isCanvasSelecting = false"
    >
      <!-- Execution Logs floating panel — centered above the canvas -->
      <Transition name="slide-up">
        <div v-if="showLogsLocal && workflowStore.activeWorkflow" class="canvas-logs-overlay">
          <ExecutionLogsPanel
            :workflow-id="workflowStore.activeWorkflow.metadata.id"
            @close="emit('update:show-logs', false)"
          />
        </div>
      </Transition>

      <!-- MARCADORES SVG CUSTOMIZADOS ATRELADOS ÀS VARIÁVEIS CSS (GLOBAL DOM) -->
      <svg style="position: absolute; width: 0; height: 0" aria-hidden="true">
        <defs>
          <marker
            id="nod8-arrow-idle"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              fill="var(--nod8-rf-arrow-stroke)"
              stroke="var(--nod8-rf-arrow-stroke)"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </marker>
          <marker
            id="nod8-arrow-success"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              fill="var(--nod8-green-500, #22c55e)"
              stroke="var(--nod8-green-500, #22c55e)"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </marker>
          <marker
            id="nod8-arrow-failed"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              fill="var(--nod8-red-500, #ef4444)"
              stroke="var(--nod8-red-500, #ef4444)"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </marker>
          <marker
            id="nod8-arrow-running"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              fill="var(--nod8-amber-500, #f59e0b)"
              stroke="var(--nod8-amber-500, #f59e0b)"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </marker>
          <marker
            id="nod8-arrow-selected"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              fill="var(--nod8-rf-arrow-stroke-selected)"
              stroke="var(--nod8-rf-arrow-stroke-selected)"
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
        :color="'var(--nod8-canvas-grid)'"
        :style="{ 'background-color': 'var(--nod8-canvas-bg)' }"
      />

      <button
        v-if="isWorkflowEmpty"
        class="canvas-empty-step nodrag nopan"
        type="button"
        @click.stop="openAddNodePanel()"
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
        <HttpNode v-bind="nodeProps" />
      </template>

      <!-- CODE Node -->
      <template #node-code="nodeProps">
        <CodeNode v-bind="nodeProps" />
      </template>

      <!-- LOOP Node -->
      <template #node-loop="nodeProps">
        <LoopNode v-bind="nodeProps" />
      </template>

      <!-- EVENT Node -->
      <template #node-event="nodeProps">
        <EventNode v-bind="nodeProps" />
      </template>

      <!-- PLUGIN Node -->
      <template #node-plugin="nodeProps">
        <PluginNode v-bind="nodeProps" />
      </template>

      <!-- EVENT LISTENER Node -->
      <template #node-event-listener="nodeProps">
        <EventListenerNode v-bind="nodeProps" />
      </template>

      <!-- SUBWORKFLOW Node -->
      <template #node-subworkflow="nodeProps">
        <SubWorkflowNode v-bind="nodeProps" />
      </template>

      <!-- IF Node -->
      <template #node-if="nodeProps">
        <IfNode v-bind="nodeProps" />
      </template>

      <!-- SET Node -->
      <template #node-set="nodeProps">
        <SetNode v-bind="nodeProps" />
      </template>

      <!-- SWITCH Node -->
      <template #node-switch="nodeProps">
        <SwitchNode v-bind="nodeProps" />
      </template>

      <!-- MERGE Node -->
      <template #node-merge="nodeProps">
        <MergeNode v-bind="nodeProps" />
      </template>

      <!-- SPLIT IN BATCHES Node -->
      <template #node-split-in-batches="nodeProps">
        <SplitInBatchesNode v-bind="nodeProps" />
      </template>

      <!-- RESPOND TO WEBHOOK Node -->
      <template #node-respond-webhook="nodeProps">
        <RespondToWebhookNode v-bind="nodeProps" />
      </template>

      <!-- WAIT FORM Node -->
      <template #node-wait-form="nodeProps">
        <WaitFormNode v-bind="nodeProps" />
      </template>
    </VueFlow>

    <!-- Node Inspector Immersive Modal -->
    <NodeInspectorModal />
  </div>
</template>

<style scoped>
.nod8-workflow-canvas {
  width: 100%;
  height: 100%;
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
  color: var(--nod8-text-primary);
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
  color: var(--nod8-text-muted);
  background: color-mix(in srgb, var(--nod8-bg-surface) 70%, transparent);
  border: 2px dashed color-mix(in srgb, var(--nod8-border-strong) 86%, var(--nod8-green-400));
  border-radius: 8px;
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--nod8-green-400, #4ade80) 55%, transparent);
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.canvas-empty-step__label {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--nod8-text-primary);
  white-space: nowrap;
}

.canvas-empty-step:hover .canvas-empty-step__box {
  color: var(--nod8-text-primary);
  background: var(--nod8-bg-surface-hover);
  border-color: var(--nod8-green-400, #4ade80);
}

.canvas-empty-step:focus-visible .canvas-empty-step__box {
  outline: 2px solid var(--nod8-node-selected);
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
  border: 1px solid var(--nod8-brand-500) !important;
  border-radius: var(--nod8-radius-sm);
  z-index: 1000;
}
</style>
