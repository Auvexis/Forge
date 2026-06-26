<template>
  <div ref="layerRef" class="workflow-edge-layer" data-workflow-edge-layer aria-hidden="true">
    <svg class="workflow-edge-layer__svg" :viewBox="svgViewBox">
      <defs>
        <marker
          v-for="marker in edgeMarkers"
          :id="marker.id"
          :key="marker.id"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" :fill="marker.color" />
        </marker>
      </defs>

      <g :transform="canvasTransform">
        <WorkflowEdge
          v-for="edgeView in edgeViews"
          :key="edgeView.edge.id"
          :edge-id="edgeView.edge.id"
          :path="edgeView.path"
          :label-x="edgeView.labelX"
          :label-y="edgeView.labelY"
          :status="edgeView.status"
          :selected="selectedEdges.includes(edgeView.edge.id)"
          :label="edgeView.edge.label"
          :item-count-label="edgeView.itemCountLabel"
          :is-configuration-edge="edgeView.isConfigurationEdge"
          @delete="deleteEdge"
          @quick-add="quickAddEdge"
          @update-label="updateEdgeLabel"
        />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { WorkflowEdge as WorkflowEdgeType } from '@/core/types/workflow.types'
import type {
  BaseCanvasItem,
  BaseCanvasPoint,
  BaseCanvasViewport,
} from '@/shared/base-canvas/index.ts'
import { useEventBus } from '@/shared/composables/useEventBus'
import { getNodeDefinition } from '../catalog/nodeDefinitionRegistry'
import { useExecutionStore } from '../stores/execution.store'
import { useWorkflowStore } from '../stores/workflow.store'
import WorkflowEdge from './WorkflowEdge.vue'
import {
  getWorkflowHandleOffset,
  type WorkflowHandleRegistry,
  type WorkflowHandleType,
} from '../workflow-canvas/workflowCanvasHandles'
import {
  countWorkflowEdgeItems,
  getWorkflowEdgeStatus,
  makeConfigurationWorkflowEdgePath,
  makeWorkflowEdgePath,
  workflowEdgeStrokeFor,
} from '../workflow-canvas/workflowCanvasEdges'

const props = defineProps<{
  edges: WorkflowEdgeType[]
  items: BaseCanvasItem[]
  viewport: BaseCanvasViewport
  handleRegistry: WorkflowHandleRegistry
  selectedEdges?: string[]
  pendingNodeId?: string | null
}>()

const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()
const quickAddBetweenBus = useEventBus('edge:quick-add-between')
const layerRef = ref<HTMLElement | null>(null)
const layerSize = ref({ width: 1, height: 1 })
let resizeObserver: ResizeObserver | null = null
const edgeGeometryCache = new Map<string, { source: BaseCanvasPoint; target: BaseCanvasPoint }>()

const selectedEdges = computed(() => props.selectedEdges ?? [])
const canvasTransform = computed(
  () => `translate(${props.viewport.x} ${props.viewport.y}) scale(${props.viewport.zoom || 1})`,
)
const svgViewBox = computed(() => `0 0 ${layerSize.value.width} ${layerSize.value.height}`)

const edgeMarkers = computed(() => [
  { id: 'sailor-workflow-arrow-idle', color: workflowEdgeStrokeFor('idle', false) },
  { id: 'sailor-workflow-arrow-success', color: workflowEdgeStrokeFor('success', false) },
  { id: 'sailor-workflow-arrow-failed', color: workflowEdgeStrokeFor('failed', false) },
  { id: 'sailor-workflow-arrow-running', color: workflowEdgeStrokeFor('running', false) },
  { id: 'sailor-workflow-arrow-waiting', color: workflowEdgeStrokeFor('waiting', false) },
  { id: 'sailor-workflow-arrow-retrying', color: workflowEdgeStrokeFor('retrying', false) },
  { id: 'sailor-workflow-arrow-selected', color: workflowEdgeStrokeFor('idle', true) },
])

const edgeViews = computed(() => {
  void props.handleRegistry.geometryVersion.value
  const activeEdgeIds = new Set(props.edges.map((edge) => edge.id))
  for (const edgeId of edgeGeometryCache.keys()) {
    if (!activeEdgeIds.has(edgeId)) edgeGeometryCache.delete(edgeId)
  }

  return props.edges.flatMap((edge) => {
    if (edge.target === props.pendingNodeId) return []
    const isConfigurationEdge = resolveIsConfigurationEdge(edge)
    const source = resolveHandlePoint(edge.source, edge.sourceHandle ?? 'source', 'source')
    const target = resolveHandlePoint(edge.target, edge.targetHandle ?? 'target', 'target')
    if (source && target) edgeGeometryCache.set(edge.id, { source, target })
    const geometry = source && target ? { source, target } : edgeGeometryCache.get(edge.id)
    if (!geometry) return []
    const path = isConfigurationEdge
      ? makeConfigurationWorkflowEdgePath(geometry.source, geometry.target)
      : makeWorkflowEdgePath(geometry.source, geometry.target)
    const status = getWorkflowEdgeStatus({
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      nodeStatuses: executionStore.nodeStatuses,
      workflowStatus: executionStore.workflowStatus,
    })
    const itemCount = countWorkflowEdgeItems(executionStore.nodeStatuses[edge.source]?.output)

    return [
      {
        edge,
        ...path,
        status,
        isConfigurationEdge,
        itemCountLabel:
          itemCount === null ? '' : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`,
      },
    ]
  })
})

function resolveHandlePoint(
  nodeId: string,
  handleId: string,
  type: WorkflowHandleType,
): BaseCanvasPoint | null {
  const handle = props.handleRegistry.getHandle(nodeId, handleId, type)
  if (!handle) return null
  const item = props.items.find((candidate) => candidate.id === nodeId)
  const offset = getWorkflowHandleOffset(handle)
  if (!item || !offset) return null

  return {
    x: item.x + offset.x,
    y: item.y + offset.y,
  }
}

function resolveIsConfigurationEdge(edge: WorkflowEdgeType): boolean {
  const targetNode = workflowStore.activeWorkflow?.nodes[edge.target]
  const targetType = String(targetNode?.type ?? '')
  const targetHandle = edge.targetHandle ?? 'target'
  const handle = getNodeDefinition(targetType)?.handles.find(
    (candidate) => candidate.type === 'target' && candidate.id === targetHandle,
  )

  return Boolean(handle?.accepts?.length)
}

function deleteEdge(edgeId: string) {
  if (!workflowStore.activeWorkflow) return
  workflowStore.activeWorkflow.edges = workflowStore.activeWorkflow.edges.filter(
    (edge) => edge.id !== edgeId,
  )
}

function quickAddEdge(edgeId: string, event: MouseEvent) {
  const edge = props.edges.find((candidate) => candidate.id === edgeId)
  if (!edge) return

  quickAddBetweenBus.emit({
    edgeId: edge.id,
    sourceId: edge.source,
    targetId: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    clientX: event.clientX,
    clientY: event.clientY,
    anchorRect: (event.currentTarget as HTMLElement).getBoundingClientRect(),
  })
}

function updateEdgeLabel(edgeId: string, label: string) {
  const edge = workflowStore.activeWorkflow?.edges.find((candidate) => candidate.id === edgeId)
  if (!edge) return
  edge.label = label
}

function updateLayerSize() {
  const rect = layerRef.value?.getBoundingClientRect()
  if (!rect) return
  layerSize.value = {
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height),
  }
}

onMounted(() => {
  updateLayerSize()
  resizeObserver = new ResizeObserver(updateLayerSize)
  if (layerRef.value) resizeObserver.observe(layerRef.value)
  window.addEventListener('resize', updateLayerSize)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('resize', updateLayerSize)
})
</script>

<style scoped>
.workflow-edge-layer {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.workflow-edge-layer__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
  pointer-events: none;
}
</style>
