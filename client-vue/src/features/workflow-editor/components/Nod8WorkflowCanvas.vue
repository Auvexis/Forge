<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow, Handle, Position, MarkerType } from '@vue-flow/core'
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
import BaseNode from './BaseNode.vue'
import BaseEdge from './BaseEdge.vue'
import { Background } from '@vue-flow/background'

// Stores
const workflowStore = useWorkflowStore()

// Mapeamentos para o VueFlow
const flowNodes = computed(() => {
  if (!workflowStore.activeWorkflow) return []

  // O backend manda os Nodes como um objeto: Record<string, Node>
  // O VueFlow exige um array no formato específico: { id, position, data }
  const normalNodes = Object.entries(workflowStore.activeWorkflow.nodes).map(
    ([nodeId, nodeData]) => ({
      id: nodeId,
      type: nodeData.type,
      // Pegamos do metadata visual salvo no bd:
      position: { x: nodeData.ui?.positionX || 0, y: nodeData.ui?.positionY || 0 },
      // Ejetamos todo o conteúdo cru lá do banco pra dentro do 'data' pra usarmos depois
      data: nodeData,
    }),
  )

  // O Nod8 Backend isola o "Trigger" FORA da array de "nodes", ele fica na raiz do workflow.
  // Mas para o VueFlow conseguir pintar ele e conectar os fios, precisamos "injetar" ele de mentira como um nó:
  const triggerRootNode = {
    id: 'trigger',
    type: 'trigger', // Faz chamar o slot #node-trigger
    position: {
      x: workflowStore.activeWorkflow.trigger.ui?.positionX || 0,
      y: workflowStore.activeWorkflow.trigger.ui?.positionY || 0,
    },
    data: { type: 'trigger' },
  }

  return [triggerRootNode, ...normalNodes]
})

const flowEdges = computed(() => {
  if (!workflowStore.activeWorkflow) return []

  return workflowStore.activeWorkflow.edges.map((edge) => ({
    ...edge,
    type: 'workflow-edge', // Chama o slot #edge-workflow-edge super poderoso cheio de toolbar!
  }))
})
</script>

<template>
  <!-- O contêiner pai deve sempre ter uma altura/largura definida para o VueFlow renderizar -->
  <div class="nod8-workflow-canvas nod8-fill">
    <VueFlow
      :nodes="flowNodes"
      :edges="flowEdges"
      :default-zoom="1.5"
      :min-zoom="0.2"
      :max-zoom="4"
      fit-view-on-init
      :snap-to-grid="true"
      :snap-grid="[10, 10]"
    >
      <!-- MARCADORES SVG CUSTOMIZADOS ATRELADOS ÀS VARIÁVEIS CSS (GLOBAL DOM) -->
      <svg style="position: absolute; width: 0; height: 0;" aria-hidden="true">
        <defs>
          <marker id="nod8-arrow-normal" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 12 6 L 0 12 z" fill="var(--nod8-rf-arrow-stroke)" />
          </marker>
          <marker id="nod8-arrow-selected" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="6" markerHeight="6" orient="auto">
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
