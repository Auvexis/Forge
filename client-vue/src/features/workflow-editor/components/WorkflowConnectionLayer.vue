<template>
  <div ref="layerRef" class="workflow-connection-layer">
    <svg class="workflow-connection-layer__svg" :viewBox="svgViewBox">
      <g :transform="canvasTransform">
        <WorkflowConnectionPreviewLine
          v-if="previewPath"
          :path="previewPath.path"
          :status="previewStatus"
        />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { WorkflowEdge } from '@/core/types/workflow.types'
import { screenToWorld, type BaseCanvasPoint, type BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import { useWorkflowStore } from '../stores/workflow.store'
import WorkflowConnectionPreviewLine from './WorkflowConnectionPreviewLine.vue'
import type { WorkflowHandleRegistry, WorkflowHandleType } from '../workflow-canvas/workflowCanvasHandles'
import {
  getWorkflowConnectionAction,
  getWorkflowConnectionPreviewPath,
  getWorkflowTargetHandlePolicy,
  type WorkflowConnectionAction,
  type WorkflowConnectionHandle,
} from '../workflow-canvas/workflowCanvasConnections'

const props = defineProps<{
  edges: WorkflowEdge[]
  viewport: BaseCanvasViewport
  handleRegistry: WorkflowHandleRegistry
}>()

const emit = defineEmits<{
  connectionCreate: [connection: Required<Omit<WorkflowConnectionAction, 'status'>>]
  connectionCancel: []
}>()

const workflowStore = useWorkflowStore()
const layerRef = ref<HTMLElement | null>(null)
const layerSize = ref({ width: 1, height: 1 })
const dragStart = ref<WorkflowConnectionHandle | null>(null)
const pointerWorld = ref<BaseCanvasPoint | null>(null)
const hoveredHandle = ref<WorkflowConnectionHandle | null>(null)

const svgViewBox = computed(() => `0 0 ${layerSize.value.width} ${layerSize.value.height}`)
const canvasTransform = computed(() => `translate(${props.viewport.x} ${props.viewport.y}) scale(${props.viewport.zoom || 1})`)
const previewStatus = computed(() => currentAction.value.status)
const previewPath = computed(() => {
  const start = dragStart.value
  const pointer = pointerWorld.value
  if (!start || !pointer) return null
  const source = resolveHandlePoint(start) ?? pointer
  const target = hoveredHandle.value ? resolveHandlePoint(hoveredHandle.value) ?? pointer : pointer

  return getWorkflowConnectionPreviewPath({ source, target })
})

const currentAction = computed<WorkflowConnectionAction>(() => {
  if (!dragStart.value || !hoveredHandle.value) return { status: 'invalid' }
  const target = dragStart.value.type === 'target' ? dragStart.value : hoveredHandle.value
  return getWorkflowConnectionAction({
    start: dragStart.value,
    end: hoveredHandle.value,
    targetHandle: getWorkflowTargetHandlePolicy(
      workflowStore.activeWorkflow,
      target.nodeId,
      target.handleId,
    ),
    existingEdges: props.edges,
  })
})

function onPointerDown(event: PointerEvent) {
  const handle = readHandleFromEvent(event)
  if (!handle) return
  dragStart.value = handle
  pointerWorld.value = eventToWorld(event)
  hoveredHandle.value = null
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
}

function onPointerMove(event: PointerEvent) {
  if (!dragStart.value) return
  pointerWorld.value = eventToWorld(event)
  hoveredHandle.value = readHandleFromEvent(event)
}

function onPointerUp(event: PointerEvent) {
  if (!dragStart.value) return
  pointerWorld.value = eventToWorld(event)
  hoveredHandle.value = readHandleFromEvent(event)

  const action = currentAction.value
  if (action.status === 'valid' && action.source && action.target && action.sourceHandle && action.targetHandle) {
    emit('connectionCreate', {
      source: action.source,
      target: action.target,
      sourceHandle: action.sourceHandle,
      targetHandle: action.targetHandle,
    })
  } else {
    emit('connectionCancel')
  }

  clearDrag()
}

function clearDrag() {
  dragStart.value = null
  pointerWorld.value = null
  hoveredHandle.value = null
  window.removeEventListener('pointermove', onPointerMove)
}

function readHandleFromEvent(event: PointerEvent): WorkflowConnectionHandle | null {
  const target = event.target instanceof Element
    ? event.target.closest('[data-workflow-handle-id]')
    : null
  if (!target) return null

  const nodeId = target.getAttribute('data-workflow-node-id')
  const handleId = target.getAttribute('data-workflow-handle-id')
  const type = target.getAttribute('data-workflow-handle-type') as WorkflowHandleType | null
  if (!nodeId || !handleId || (type !== 'source' && type !== 'target')) return null

  return { nodeId, handleId, type }
}

function resolveHandlePoint(handle: WorkflowConnectionHandle): BaseCanvasPoint | null {
  const registration = props.handleRegistry.getHandle(handle.nodeId, handle.handleId, handle.type)
  const layerRect = layerRef.value?.getBoundingClientRect()
  const handleRect = registration?.element.getBoundingClientRect()
  if (!layerRect || !handleRect) return null

  return screenToWorld({
    x: handleRect.left + handleRect.width / 2 - layerRect.left,
    y: handleRect.top + handleRect.height / 2 - layerRect.top,
  }, props.viewport)
}

function eventToWorld(event: PointerEvent): BaseCanvasPoint {
  const rect = layerRef.value?.getBoundingClientRect()
  return screenToWorld({
    x: event.clientX - (rect?.left ?? 0),
    y: event.clientY - (rect?.top ?? 0),
  }, props.viewport)
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
  layerRef.value?.parentElement?.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('resize', updateLayerSize)
})

onBeforeUnmount(() => {
  layerRef.value?.parentElement?.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('resize', updateLayerSize)
  clearDrag()
})
</script>

<style scoped>
.workflow-connection-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.workflow-connection-layer__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
  pointer-events: none;
}
</style>
