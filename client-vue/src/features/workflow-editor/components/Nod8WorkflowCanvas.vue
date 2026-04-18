<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { Node, Edge, NodeMouseEvent, NodeDragEvent, Connection } from '@vue-flow/core'
import { useWorkflowStore } from '../stores/workflow.store'
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
import type { WorkflowNodeType } from '@/core/types/workflow.types'

// Stores
const workflowStore = useWorkflowStore()
const panelStore = useAppPanelStore()
const { project, viewport } = useVueFlow()

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
    data: { type: 'trigger' },
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

const openAddNodePanel = () => {
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

const addLogicNode = (type: WorkflowNodeType) => {
  if (!workflowStore.activeWorkflow) return

  const id = `${type}_${Date.now()}`
  const pos = getCenterPosition()

  // Adicionar no store
  workflowStore.activeWorkflow.nodes[id] = {
    type,
    name: id,
    ui: { positionX: pos.x, positionY: pos.y },
  } as any

  // Adicionar no VueFlow
  vueFlowNodes.value.push({
    id,
    type,
    position: pos,
    data: workflowStore.activeWorkflow.nodes[id],
  })

  workflowStore.markDirty()
  panelStore.closePanel()
}

const addPluginNode = (pluginId: string, action: string, actionName: string) => {
  if (!workflowStore.activeWorkflow) return

  const id = `${action}_${Date.now()}`
  const pos = getCenterPosition()

  workflowStore.activeWorkflow.nodes[id] = {
    type: 'plugin',
    name: actionName,
    pluginId,
    action,
    params: {},
    ui: { positionX: pos.x, positionY: pos.y },
  } as any

  vueFlowNodes.value.push({
    id,
    type: 'plugin',
    position: pos,
    data: workflowStore.activeWorkflow.nodes[id],
  })

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
</script>

<template>
  <!-- O contêiner pai deve sempre ter uma altura/largura definida para o VueFlow renderizar -->
  <div class="nod8-workflow-canvas nod8-fill">
    <VueFlow
      v-model:nodes="vueFlowNodes"
      v-model:edges="vueFlowEdges"
      :default-zoom="1.5"
      :min-zoom="0.2"
      :max-zoom="4"
      fit-view-on-init
      :snap-to-grid="true"
      :snap-grid="[10, 10]"
      @node-click="onNodeClick"
      @node-drag-stop="onNodeDragStop"
      @connect="onConnect"
      @edges-change="onEdgesChange"
    >
      <EditorControlsDock
        :is-saving="workflowStore.isSaving"
        @save="workflowStore.saveActiveWorkflow()"
        @add-node="openAddNodePanel"
      />

      <!-- MARCADORES SVG CUSTOMIZADOS ATRELADOS ÀS VARIÁVEIS CSS (GLOBAL DOM) -->
      <svg style="position: absolute; width: 0; height: 0" aria-hidden="true">
        <defs>
          <marker
            id="nod8-arrow-normal"
            viewBox="0 0 12 12"
            refX="11"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 12 6 L 0 12 z" fill="var(--nod8-rf-arrow-stroke)" />
          </marker>
          <marker
            id="nod8-arrow-selected"
            viewBox="0 0 12 12"
            refX="11"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 12 6 L 0 12 z" fill="var(--nod8-rf-arrow-stroke-selected)" />
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
</style>
