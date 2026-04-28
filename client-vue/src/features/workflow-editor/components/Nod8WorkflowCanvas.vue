<script setup lang="ts">
import { ref, watch, markRaw, computed } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { Node, Edge, NodeMouseEvent, NodeDragEvent, Connection } from '@vue-flow/core'
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
import BaseEdge from './BaseEdge.vue'
import { Background } from '@vue-flow/background'

import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import NodeEditorDrawer from './settings/NodeEditorDrawer.vue'
import AddNodePanel from './settings/AddNodePanel.vue'
import EditorControlsDock from './ui/EditorControlsDock.vue'
import RunWorkflowPanel from './execution/RunWorkflowPanel.vue'
import ExecutionLogsPanel from './execution/ExecutionLogsPanel.vue'
import type { WorkflowNodeType, WorkflowNode } from '@/core/types/workflow.types'
import { useEventBus } from '@/shared/composables/useEventBus'

// Stores
const workflowStore = useWorkflowStore()
const panelStore = useAppPanelStore()
const executionStore = useExecutionStore()
const { project, findNode, updateNode } = useVueFlow()

// ── Props / emits (for v-model:show-logs from parent page) ──────────────────
const props = defineProps<{
  showLogs?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show-logs', value: boolean): void
}>()

// ── Local alias so internal logic can still read the value ────────────────
const showLogsLocal = computed(() => props.showLogs ?? false)

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

  const triggerNode: Node = {
    id: 'trigger',
    type: 'trigger',
    position: {
      x: workflowStore.activeWorkflow.trigger.ui?.positionX ?? 0,
      y: workflowStore.activeWorkflow.trigger.ui?.positionY ?? 0,
    },
    data: { ...workflowStore.activeWorkflow.trigger },
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

// Reinicializa o VueFlow apenas quando muda o workflow (não a cada edição de campo)
watch(
  () => workflowStore.activeWorkflow?.metadata?.id,
  () => {
    vueFlowNodes.value = buildNodes()
    vueFlowEdges.value = buildEdges()
  },
  { immediate: true },
)

watch(
  () => workflowStore.graphUpdateTrigger,
  () => {
    vueFlowNodes.value = buildNodes()
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
      if (vfNode.id === 'trigger') {
        if (trigger && vfNode.data !== trigger) {
          vfNode.data = { ...trigger }
        }
      } else if (nodes) {
        const storeData = nodes[vfNode.id]
        if (storeData && vfNode.data !== storeData) {
          vfNode.data = { ...storeData }
        }
      }
    }
  },
  { deep: true },
)

// ── Eventos ─────────────────────────────────────────────────────────────────

const onNodeClick = (event: NodeMouseEvent) => {
  panelStore.openPanel({
    title: 'Configurações',
    component: NodeEditorDrawer,
    props: { node: event.node },
    position: 'right',
    width: 'lg',
  })
}

// ── Add Node ─────────────────────────────────────────────────────────────────

/**
 * Retorna a posição no mundo (canvas coords) do centro atual da viewport.
 * Usamos isso para adicionar novo node sempre visível na tela.
 */
function getCenterPosition(): { x: number; y: number } {
  const el = document.querySelector('.vue-flow__viewport') as HTMLElement
  const width = el?.offsetWidth ?? 600
  const height = el?.offsetHeight ?? 400
  // project() converte coordenadas da tela pra coordenadas do canvas
  return project({ x: width / 2, y: height / 2 })
}

let quickAddSourceId: string | null = null

const quickAddBus = useEventBus('node:quick-add')
quickAddBus.on((payload: { sourceId: string }) => {
  openAddNodePanel(payload.sourceId)
})

const openAddNodePanel = (sourceId?: string | null) => {
  quickAddSourceId = sourceId || null

  panelStore.openPanel({
    title: 'Adicionar Node',
    component: AddNodePanel,
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

  const schema = workflowStore.activeWorkflow.trigger.schema ?? {}

  if (Object.keys(schema).length > 0) {
    panelStore.openPanel({
      title: 'Run Workflow',
      component: markRaw(RunWorkflowPanel),
      props: {
        workflowId: workflowStore.activeWorkflow.metadata.id,
        schema,
        triggerType: workflowStore.activeWorkflow.trigger.type,
      },
      position: 'right',
      width: 'md',
    })
  } else {
    await executionStore.execute(workflowStore.activeWorkflow.metadata.id)
  }
}

async function handleStop() {
  await executionStore.cancel()
}

function handleToggleLogs() {
  emit('update:show-logs', !props.showLogs)
}

// Friendly default name per node type (shown in the node header before the user renames it)
const NODE_DEFAULT_NAMES: Partial<Record<WorkflowNodeType, string>> = {
  code: 'Code Block',
  if: 'Conditional',
  loop: 'Loop / ForEach',
  subworkflow: 'Sub-Workflow',
  http: 'HTTP Request',
  event: 'Emit Event',
  'event-listener': 'Wait for Event',
  plugin: 'Plugin Action',
}

function getNewNodePosition(sourceId: string | null): { x: number; y: number } {
  if (sourceId) {
    const nodes = vueFlowNodes.value as any[]
    const sourceNode = nodes.find((n) => n.id === sourceId)
    if (sourceNode) {
      // Posição x: 350px para a direita. O Y vamos apenas herdar e o alignNodeCenters corrige depois
      return { x: sourceNode.position.x + 350, y: sourceNode.position.y }
    }
  }
  return getCenterPosition()
}

function alignNodeCenters(sourceId: string, targetId: string) {
  const checkAndAlign = (attempts = 0) => {
    const sNode = findNode(sourceId)
    const tNode = findNode(targetId)

    const sHeight = sNode?.dimensions?.height || 0
    const tHeight = tNode?.dimensions?.height || 0

    if (sHeight > 0 && tHeight > 0) {
      const centerY = sNode!.position.y + sHeight / 2
      const newY = centerY - tHeight / 2

      // Atualiza o Y via VueFlow state
      updateNode(targetId, { position: { x: tNode!.position.x, y: newY } })
      
      // Atualiza a prop reativa do VueFlow (array model)
      const vNode = (vueFlowNodes.value as any[]).find(n => n.id === targetId)
      if (vNode) vNode.position.y = newY

      // Atualiza a store
      if (workflowStore.activeWorkflow?.nodes[targetId]) {
        workflowStore.activeWorkflow.nodes[targetId].ui!.positionY = newY
        workflowStore.updateNodeData(targetId, { ui: { ...workflowStore.activeWorkflow.nodes[targetId].ui, positionY: newY }})
      }
    } else if (attempts < 30) {
      setTimeout(() => checkAndAlign(attempts + 1), 30)
    }
  }

  checkAndAlign()
}

function autoConnectToSource(sourceId: string, targetId: string) {
  if (!workflowStore.activeWorkflow) return

  const newEdge = {
    id: `e-${sourceId}-${targetId}-${Date.now()}`,
    source: sourceId,
    target: targetId,
    sourceHandle: 'source',
    targetHandle: 'target',
  }

  workflowStore.activeWorkflow.edges.push(newEdge)
  vueFlowEdges.value.push({ ...newEdge, type: 'workflow-edge' })
}

const addLogicNode = (type: WorkflowNodeType) => {
  if (!workflowStore.activeWorkflow) return

  const backupSourceId = quickAddSourceId
  quickAddSourceId = null // reset immediately
  
  const id = `${type}_${Date.now()}`
  const pos = getNewNodePosition(backupSourceId)

  // Adicionar no store
  const newNode: any = {
    type,
    name: NODE_DEFAULT_NAMES[type] ?? id,
    ui: { positionX: pos.x, positionY: pos.y },
  }
  workflowStore.activeWorkflow.nodes[id] = newNode

  // Adicionar no VueFlow
  vueFlowNodes.value.push({
    id,
    type,
    position: pos,
    data: newNode,
  })

  if (backupSourceId) {
    autoConnectToSource(backupSourceId, id)
    alignNodeCenters(backupSourceId, id)
  }

  workflowStore.markDirty()
  panelStore.closePanel()
}

const addPluginNode = (pluginId: string, action: string, actionName: string) => {
  if (!workflowStore.activeWorkflow) return

  const backupSourceId = quickAddSourceId
  quickAddSourceId = null // reset immediately

  const id = `${action}_${Date.now()}`
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
    autoConnectToSource(backupSourceId, id)
    alignNodeCenters(backupSourceId, id)
  }

  workflowStore.markDirty()
  panelStore.closePanel()
}

/**
 * Sincroniza a nova posição de volta pro store quando o drag termina.
 * Isso garante que o save envie as coordenadas corretas pro backend.
 */
const onNodeDragStop = (event: NodeDragEvent) => {
  const { node } = event
  workflowStore.updateNodeData(node.id, {
    ui: {
      ...(node.data?.ui ?? {}),
      positionX: node.position.x,
      positionY: node.position.y,
    },
  })
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

  workflowStore.markDirty()
}

type EdgeChange = { type: string; id?: string }
const onEdgesChange = (changes: EdgeChange[]) => {
  const removals = changes.filter((c) => c.type === 'remove')
  if (removals.length && workflowStore.activeWorkflow) {
    const removedIds = new Set(removals.map((c) => c.id))
    workflowStore.activeWorkflow.edges = workflowStore.activeWorkflow.edges.filter(
      (e) => !removedIds.has(e.id),
    )
    workflowStore.markDirty()
  }
}

// ── Expose public API so WorkflowEditorPage can call these ────────────────
defineExpose({ handleRun, handleStop, openAddNodePanel })
</script>

<template>
  <!-- O contêiner pai deve sempre ter uma altura/largura definida para o VueFlow renderizar -->
  <div class="nod8-workflow-canvas nod8-fill">
    <VueFlow
      v-model:nodes="vueFlowNodes"
      v-model:edges="vueFlowEdges"
      :default-zoom="1"
      :min-zoom="0.5"
      :max-zoom="1.5"
      fit-view-on-init
      :snap-to-grid="true"
      :snap-grid="[10, 10]"
      :delete-key-code="null"
      @node-click="onNodeClick"
      @node-drag-stop="onNodeDragStop"
      @connect="onConnect"
      @edges-change="onEdgesChange"
    >
      <!-- Bottom zoom controls dock (no run/stop/save — those are in the top AppDock) -->
      <EditorControlsDock
        :is-saving="workflowStore.isSaving"
        :is-executing="executionStore.isExecuting"
        :is-streaming="executionStore.isStreaming"
        :is-logs-open="showLogsLocal"
        @save="workflowStore.saveActiveWorkflow()"
        @add-node="() => openAddNodePanel(null)"
        @run="handleRun"
        @stop="handleStop"
        @toggle-logs="handleToggleLogs"
      />

      <!-- Execution Logs floating panel — centered above the canvas -->
      <div v-if="showLogsLocal && workflowStore.activeWorkflow" class="canvas-logs-overlay">
        <ExecutionLogsPanel
          :workflow-id="workflowStore.activeWorkflow.metadata.id"
          @close="emit('update:show-logs', false)"
        />
      </div>

      <!-- MARCADORES SVG CUSTOMIZADOS ATRELADOS ÀS VARIÁVEIS CSS (GLOBAL DOM) -->
      <svg style="position: absolute; width: 0; height: 0" aria-hidden="true">
        <defs>
          <marker
            id="nod8-arrow-normal"
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
        :stroke="'var(--nod8-canvas-grid)'"
        :style="{ 'background-color': 'var(--nod8-canvas-bg)' }"
      />

      <!-- Custom Edge (Contains trash toolbar etc) -->
      <template #edge-workflow-edge="edgeProps">
        <BaseEdge v-bind="edgeProps" />
      </template>

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
    </VueFlow>
  </div>
</template>

<style scoped>
.nod8-workflow-canvas {
  width: 100%;
  height: 100%;
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
  left: 50%;
  transform: translateX(-50%);
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
