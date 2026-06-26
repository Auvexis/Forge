<template>
  <div ref="layerRef" class="workflow-edge-layer" aria-hidden="true">
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
import { screenToWorld, type BaseCanvasItem, type BaseCanvasPoint, type BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import { useEventBus } from '@/shared/composables/useEventBus'
import { getNodeDefinition } from '../catalog/nodeDefinitionRegistry'
import { useExecutionStore } from '../stores/execution.store'
import { useWorkflowStore } from '../stores/workflow.store'
import WorkflowEdge from './WorkflowEdge.vue'
import type { WorkflowHandleRegistry, WorkflowHandleType } from '../workflow-canvas/workflowCanvasHandles'
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
}>()

const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()
const quickAddBetweenBus = useEventBus('edge:quick-add-between')
const layerRef = ref<HTMLElement | null>(null)
const layerSize = ref({ width: 1, height: 1 })

const selectedEdges = computed(() => props.selectedEdges ?? [])
const canvasTransform = computed(() => `translate(${props.viewport.x} ${props.viewport.y}) scale(${props.viewport.zoom || 1})`)
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

const edgeViews = computed(() => props.edges.map((edge) => {
  const isConfigurationEdge = resolveIsConfigurationEdge(edge)
  const source = resolveHandlePoint(edge.source, edge.sourceHandle ?? 'source', 'source')
  const target = resolveHandlePoint(edge.target, edge.targetHandle ?? 'target', 'target')
  const path = isConfigurationEdge
    ? makeConfigurationWorkflowEdgePath(source, target)
    : makeWorkflowEdgePath(source, target)
  const status = getWorkflowEdgeStatus({
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    nodeStatuses: executionStore.nodeStatuses,
    workflowStatus: executionStore.workflowStatus,
  })
  const itemCount = countWorkflowEdgeItems(executionStore.nodeStatuses[edge.source]?.output)

  return {
    edge,
    ...path,
    status,
    isConfigurationEdge,
    itemCountLabel: itemCount === null ? '' : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`,
  }
}))

function resolveHandlePoint(nodeId: string, handleId: string, type: WorkflowHandleType): BaseCanvasPoint {
  const fallback = fallbackHandlePoint(nodeId, type)
  const handle = props.handleRegistry.getHandle(nodeId, handleId, type)
  const layerRect = layerRef.value?.getBoundingClientRect()
  const handleRect = handle?.element.getBoundingClientRect()

  if (!layerRect || !handleRect) return fallback

  return screenToWorld({
    x: handleRect.left + handleRect.width / 2 - layerRect.left,
    y: handleRect.top + handleRect.height / 2 - layerRect.top,
  }, props.viewport)
}

function fallbackHandlePoint(nodeId: string, type: WorkflowHandleType): BaseCanvasPoint {
  const item = props.items.find((candidate) => candidate.id === nodeId)
  if (!item) return { x: 0, y: 0 }

  const width = item.width ?? 240
  const height = item.height ?? 96

  return {
    x: item.x + (type === 'source' ? width : 0),
    y: item.y + height / 2,
  }
}

function resolveIsConfigurationEdge(edge: WorkflowEdgeType): boolean {
  const targetNode = workflowStore.activeWorkflow?.nodes[edge.target]
  const targetType = String(targetNode?.type ?? '')
  const targetHandle = edge.targetHandle ?? 'target'
  const handle = getNodeDefinition(targetType)?.handles.find((candidate) =>
    candidate.type === 'target' && candidate.id === targetHandle,
  )

  return Boolean(handle?.accepts?.length)
}

function deleteEdge(edgeId: string) {
  if (!workflowStore.activeWorkflow) return
  workflowStore.activeWorkflow.edges = workflowStore.activeWorkflow.edges.filter((edge) => edge.id !== edgeId)
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
  window.addEventListener('resize', updateLayerSize)
})

onBeforeUnmount(() => {
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
