<template>
  <div ref="canvasElement" class="plugin-creator-canvas">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      :default-zoom="1"
      :min-zoom="0.4"
      :max-zoom="1.8"
      :snap-to-grid="true"
      :snap-grid="[20, 20]"
      fit-view-on-init
      :nodes-draggable="tool !== 'pan'"
      :nodes-connectable="true"
      :elements-selectable="tool !== 'pan'"
      :pan-on-drag="true"
      :delete-key-code="['Delete']"
      class="plugin-creator-canvas__flow"
      @init="onInit"
      @node-click="onNodeClick"
      @node-double-click="onNodeDoubleClick"
      @node-drag-stop="onNodeDragStop"
      @connect="onConnect"
      @edges-change="onEdgesChange"
      @pane-click="selectedNodeIds = []"
    >
      <Background
        :gap="20"
        :size="1"
        variant="dots"
        color="var(--sailor-canvas-grid)"
        :style="{ 'background-color': 'var(--sailor-canvas-bg)' }"
      />

      <svg style="position: absolute; width: 0; height: 0" aria-hidden="true">
        <defs>
          <marker
            v-for="marker in edgeMarkers"
            :id="marker.id"
            :key="marker.id"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              :fill="marker.color"
              :stroke="marker.color"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </marker>
        </defs>
      </svg>

      <template #edge-plugin-creator-edge="edgeProps">
        <PluginCreatorEdge v-bind="edgeProps" />
      </template>

      <PluginCreatorNodeGroupSelectionBox
        :on-duplicate-selection="duplicateSelection"
        :on-delete-selection="deleteSelection"
      />

      <div v-if="!blueprint" class="plugin-creator-canvas__empty nodrag nopan">
        Open or create a plugin to start mapping methods.
      </div>
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, ref } from 'vue'
import {
  VueFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypesObject,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import type {
  PluginBlueprint,
  PluginBlueprintPosition,
} from '../../../core/types/plugin-creator.types.ts'
import MethodNode from './nodes/MethodNode.vue'
import InputNode from './nodes/InputNode.vue'
import CredentialNode from './nodes/CredentialNode.vue'
import RequestNode from './nodes/RequestNode.vue'
import ResponseMapperNode from './nodes/ResponseMapperNode.vue'
import ErrorMapperNode from './nodes/ErrorMapperNode.vue'
import OutputNode from './nodes/OutputNode.vue'
import PluginCreatorEdge from '../../workflow-editor/components/BaseEdge.vue'
import PluginCreatorNodeGroupSelectionBox from './PluginCreatorNodeGroupSelectionBox.vue'

const props = defineProps<{
  blueprint?: PluginBlueprint | null
  tool?: 'cursor' | 'pan' | 'delete'
}>()

const emit = defineEmits<{
  'select-node': [nodeId: string]
  'update-node-position': [payload: { nodeId: string; position: PluginBlueprintPosition }]
  'connect-nodes': [
    payload: { source: string; target: string; sourceHandle?: string; targetHandle?: string },
  ]
  'remove-edges': [edgeIds: string[]]
  'delete-selected': [nodeIds: string[]]
  'duplicate-selected': [nodeIds: string[]]
  'open-node-settings': [nodeId: string]
}>()

const vueFlow = ref<{
  zoomTo?: (zoom: number, options?: { duration?: number }) => void
  fitView?: (options?: { duration?: number }) => void
  screenToFlowCoordinate?: (position: PluginBlueprintPosition) => PluginBlueprintPosition
  getSelectedNodes?: unknown
} | null>(null)
const canvasElement = ref<HTMLElement | null>(null)
const selectedNodeIds = ref<string[]>([])

const nodeTypes = {
  method: markRaw(MethodNode),
  input: markRaw(InputNode),
  credential: markRaw(CredentialNode),
  request: markRaw(RequestNode),
  header: markRaw(RequestNode),
  query: markRaw(RequestNode),
  body: markRaw(RequestNode),
  responseMapper: markRaw(ResponseMapperNode),
  errorMapper: markRaw(ErrorMapperNode),
  output: markRaw(OutputNode),
} as unknown as NodeTypesObject

const edgeMarkers = [
  { id: 'sailor-arrow-idle', color: 'var(--sailor-rf-arrow-stroke)' },
  { id: 'sailor-arrow-success', color: 'var(--sailor-green-500, #22c55e)' },
  { id: 'sailor-arrow-failed', color: 'var(--sailor-red-500, #ef4444)' },
  { id: 'sailor-arrow-running', color: 'var(--sailor-amber-500, #f59e0b)' },
  { id: 'sailor-arrow-selected', color: 'var(--sailor-rf-arrow-stroke-selected)' },
]

const nodes = computed<Node[]>({
  get() {
    const blueprint = props.blueprint
    if (!blueprint) return []

    return Object.values(blueprint.canvas.nodes).map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        hasOutgoingConnection: blueprint.canvas.edges.some((edge) => edge.source === node.id),
      },
    }))
  },
  set() {
    // Store sync lands in a later inspector/canvas task.
  },
})

const edges = computed<Edge[]>({
  get() {
    const blueprint = props.blueprint
    if (!blueprint) return []

    return blueprint.canvas.edges.map((edge) => ({
      ...edge,
      type: 'plugin-creator-edge',
    }))
  },
  set() {
    // Store sync lands in a later inspector/canvas task.
  },
})

function onNodeClick(event: { node?: Node }) {
  if (props.tool === 'pan') return
  if (event.node?.id) {
    selectedNodeIds.value = [event.node.id]
    emit('select-node', event.node.id)
    if (props.tool === 'delete') {
      emit('delete-selected', [event.node.id])
    }
  }
}

function onNodeDoubleClick(event: { node?: Node }) {
  if (event.node?.id) {
    emit('open-node-settings', event.node.id)
  }
}

function onInit(instance: unknown) {
  vueFlow.value = instance as typeof vueFlow.value
}

function onNodeDragStop(event: { node?: Node; nodes?: Node[] }) {
  const draggedNodes = event.nodes?.length ? event.nodes : event.node ? [event.node] : []
  for (const node of draggedNodes) {
    emit('update-node-position', {
      nodeId: node.id,
      position: {
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
      },
    })
  }
}

function onConnect(connection: Connection) {
  if (!connection.source || !connection.target) return
  emit('connect-nodes', {
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle ?? undefined,
    targetHandle: connection.targetHandle ?? undefined,
  })
}

function onEdgesChange(changes: Array<{ type: string; id?: string }>) {
  const edgeIds = changes
    .filter((change) => change.type === 'remove' && change.id)
    .map((change) => change.id!)
  if (edgeIds.length > 0) {
    emit('remove-edges', edgeIds)
  }
}

function selectedCanvasNodeIds() {
  const selectedNodes = selectedNodesFromVueFlow()
  if (selectedNodes?.length) {
    return selectedNodes.map((node) => node.id)
  }
  return selectedNodeIds.value
}

function selectedNodesFromVueFlow(): Node[] {
  const selectedNodes = vueFlow.value?.getSelectedNodes
  if (Array.isArray(selectedNodes)) {
    return selectedNodes
  }
  if (typeof selectedNodes === 'function') {
    return selectedNodes()
  }
  if (selectedNodes && typeof selectedNodes === 'object' && 'value' in selectedNodes) {
    return selectedNodes.value as Node[]
  }
  return []
}

function deleteSelection() {
  const nodeIds = selectedCanvasNodeIds()
  if (nodeIds.length > 0) {
    emit('delete-selected', nodeIds)
    selectedNodeIds.value = []
  }
}

function duplicateSelection() {
  const nodeIds = selectedCanvasNodeIds()
  if (nodeIds.length > 0) {
    emit('duplicate-selected', nodeIds)
  }
}

function zoomTo(value: number) {
  vueFlow.value?.zoomTo?.(value, { duration: 180 })
}

function fitView() {
  vueFlow.value?.fitView?.({ duration: 220 })
}

function centerPosition(): PluginBlueprintPosition {
  const bounds = canvasElement.value?.getBoundingClientRect()
  if (!bounds || !vueFlow.value?.screenToFlowCoordinate) {
    return { x: 260, y: 220 }
  }

  return vueFlow.value.screenToFlowCoordinate({
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  })
}

defineExpose({
  centerPosition,
  deleteSelection,
  fitView,
  zoomTo,
})
</script>

<style scoped>
.plugin-creator-canvas {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: var(--sailor-canvas-bg, #080909);
}

.plugin-creator-canvas__flow {
  width: 100%;
  height: 100%;
}

.plugin-creator-canvas__empty {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 5;
  transform: translate(-50%, -50%);
  color: var(--sailor-text-secondary, #526173);
  font-size: 13px;
  font-weight: 600;
  pointer-events: none;
}
</style>
