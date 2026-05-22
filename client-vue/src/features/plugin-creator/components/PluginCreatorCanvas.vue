<template>
  <div ref="canvasElement" class="plugin-creator-canvas">
    <VueFlow
      v-model:nodes="vueFlowNodes"
      v-model:edges="vueFlowEdges"
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
      :selection-key-code="null"
      :delete-key-code="['Delete']"
      class="plugin-creator-canvas__flow"
      @init="onInit"
      @node-click="onNodeClick"
      @node-double-click="onNodeDoubleClick"
      @node-drag-stop="onNodeDragStop"
      @connect="onConnect"
      @edges-change="onEdgesChange"
      @selection-drag-start="isCanvasSelecting = true"
      @selection-drag-stop="isCanvasSelecting = false"
      @pane-click="selectedNodeIds = []"
    >
      <Background
        :gap="20"
        :size="1"
        variant="dots"
        color="var(--sailor-canvas-grid)"
        :style="{ 'background-color': 'var(--sailor-canvas-bg)' }"
      />

      <button
        v-if="isCanvasEmpty"
        class="canvas-empty-step nodrag nopan"
        type="button"
        @click.stop="openAddItem"
      >
        <span class="canvas-empty-step__box">
          <Plus :size="34" />
        </span>
        <span class="canvas-empty-step__label">Add first step...</span>
      </button>

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
import { computed, markRaw, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import {
  VueFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypesObject,
  type VueFlowStore,
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
import CodeBlockNode from './nodes/CodeBlockNode.vue'
import IfNode from './nodes/IfNode.vue'
import SwitchNode from './nodes/SwitchNode.vue'
import TryCatchNode from './nodes/TryCatchNode.vue'
import JsonTransformNode from './nodes/JsonTransformNode.vue'
import ReturnNode from './nodes/ReturnNode.vue'
import ForNode from './nodes/ForNode.vue'
import ForEachNode from './nodes/ForEachNode.vue'
import PluginCreatorEdge from './PluginCreatorEdge.vue'
import PluginCreatorNodeGroupSelectionBox from './PluginCreatorNodeGroupSelectionBox.vue'
import { usePluginCreatorExecutionStore } from '../stores/pluginCreatorExecution.store.ts'

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
  'add-first-node': []
  'open-node-settings': [nodeId: string]
}>()

const vueFlow = ref<VueFlowStore | null>(null)
const canvasElement = ref<HTMLElement | null>(null)
const selectedNodeIds = ref<string[]>([])
const isCanvasSelecting = ref(false)
const isApplyingGraphSnapshot = ref(false)
const vueFlowNodes = ref<Node[]>([])
const vueFlowEdges = ref<Edge[]>([])
const executionStore = usePluginCreatorExecutionStore()

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
  codeBlock: markRaw(CodeBlockNode),
  if: markRaw(IfNode),
  switch: markRaw(SwitchNode),
  tryCatch: markRaw(TryCatchNode),
  jsonTransform: markRaw(JsonTransformNode),
  return: markRaw(ReturnNode),
  for: markRaw(ForNode),
  forEach: markRaw(ForEachNode),
  output: markRaw(OutputNode),
} as unknown as NodeTypesObject

const edgeMarkers = [
  { id: 'sailor-arrow-idle', color: 'var(--sailor-rf-arrow-stroke)' },
  { id: 'sailor-arrow-success', color: 'var(--sailor-green-500, #22c55e)' },
  { id: 'sailor-arrow-failed', color: 'var(--sailor-red-500, #ef4444)' },
  { id: 'sailor-arrow-running', color: 'var(--sailor-amber-500, #f59e0b)' },
  { id: 'sailor-arrow-selected', color: 'var(--sailor-rf-arrow-stroke-selected)' },
]

function buildNodes() {
  const blueprint = props.blueprint
  if (!blueprint) return []

  return Object.values(blueprint.canvas.nodes).map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      status: executionStore.nodeStatuses[node.id]?.status ?? 'idle',
      hasOutgoingConnection: blueprint.canvas.edges.some((edge) => edge.source === node.id),
    },
  }))
}

function buildEdges() {
  const blueprint = props.blueprint
  if (!blueprint) return []

  return blueprint.canvas.edges.map((edge) => ({
    ...edge,
    type: 'plugin-creator-edge',
  }))
}

async function replaceGraphFromBlueprint() {
  isApplyingGraphSnapshot.value = true
  vueFlowNodes.value = buildNodes()
  vueFlowEdges.value = buildEdges()
  await nextTick()
  isApplyingGraphSnapshot.value = false
}

const isCanvasEmpty = computed(() => {
  const blueprint = props.blueprint
  if (!blueprint) return false
  return Object.keys(blueprint.canvas.nodes).length === 0 && blueprint.canvas.edges.length === 0
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

async function onInit(instance: VueFlowStore) {
  vueFlow.value = instance
  await nextTick()
  instance.updateNodeInternals()
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
  if (isApplyingGraphSnapshot.value) return
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
  return vueFlow.value?.getSelectedNodes ?? []
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

function openAddItem() {
  emit('add-first-node')
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

onBeforeUnmount(() => {
  isApplyingGraphSnapshot.value = true
  const instance = vueFlow.value
  if (!instance) return
  if (instance.nodes.length > 0) instance.removeNodes(instance.nodes)
  if (instance.edges.length > 0) instance.removeEdges(instance.edges)
})

watch(
  () => props.blueprint?.id,
  () => replaceGraphFromBlueprint(),
  { immediate: true },
)

watch(
  () => props.blueprint?.canvas.edges.map((edge) => `${edge.id}:${edge.source}:${edge.sourceHandle ?? ''}:${edge.target}:${edge.targetHandle ?? ''}`).join('|'),
  () => {
    if (isApplyingGraphSnapshot.value) return
    vueFlowEdges.value = buildEdges()
  },
)

watch(
  () => props.blueprint?.canvas.nodes,
  (nodes) => {
    if (!nodes) return

    const existingIds = new Set(vueFlowNodes.value.map((node) => node.id))
    const nextIds = new Set(Object.keys(nodes))
    if (
      existingIds.size !== nextIds.size ||
      [...nextIds].some((nodeId) => !existingIds.has(nodeId))
    ) {
      void replaceGraphFromBlueprint()
      return
    }

    for (const vfNode of vueFlowNodes.value) {
      const blueprintNode = nodes[vfNode.id]
      if (!blueprintNode) continue
      vfNode.type = blueprintNode.type
      Object.assign(vfNode.data, {
        ...blueprintNode.data,
        status: executionStore.nodeStatuses[vfNode.id]?.status ?? 'idle',
        hasOutgoingConnection:
          props.blueprint?.canvas.edges.some((edge) => edge.source === vfNode.id) ?? false,
      })
    }
  },
  { deep: true },
)

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
  border: 0;
  background: transparent;
  color: var(--sailor-text-primary);
  cursor: pointer;
  transform: translate(-50%, -50%);
}

.canvas-empty-step__box {
  width: 82px;
  height: 82px;
  display: grid;
  place-items: center;
  border: 2px dashed var(--sailor-border-strong);
  border-radius: 8px;
  background: color-mix(in srgb, var(--sailor-bg-surface) 70%, transparent);
  color: var(--sailor-text-muted);
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.canvas-empty-step__label {
  color: var(--sailor-text-primary);
  font-size: 13px;
  line-height: 1.2;
  white-space: nowrap;
}

.canvas-empty-step:hover .canvas-empty-step__box {
  border-color: var(--sailor-text-primary);
  background: var(--sailor-bg-surface-hover);
  color: var(--sailor-text-primary);
}

.canvas-empty-step:focus-visible .canvas-empty-step__box {
  outline: 2px solid var(--sailor-node-selected);
  outline-offset: 3px;
}

:deep(.vue-flow__selectionpane),
:deep(.vue-flow__selection) {
  z-index: 1000;
  border: 1px solid var(--sailor-text-primary) !important;
  border-radius: var(--sailor-radius-sm);
  background-color: color-mix(in srgb, var(--sailor-text-primary) 10%, transparent) !important;
}
</style>
