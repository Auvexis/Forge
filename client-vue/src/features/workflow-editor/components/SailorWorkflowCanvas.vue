<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { WorkflowNodeType } from '@/core/types/workflow.types'
import { workflowNodesApi } from '@/core/api/workflowNodes.api'
import { useApi } from '@/shared/composables/useApi'
import { useEventBus } from '@/shared/composables/useEventBus'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { replaceNodeDefinitions } from '../catalog/nodeDefinitionRegistry'
import { useWorkflowStore } from '../stores/workflow.store'
import type { AllowedNodes } from './nodePresentation.types'
import AddNodePanel from './settings/AddNodePanel.vue'
import NodeInspectorModal from './settings/NodeInspectorModal.vue'
import WorkflowBaseCanvas from './WorkflowBaseCanvas.vue'

type WorkflowBaseCanvasPublicApi = InstanceType<typeof WorkflowBaseCanvas>
type AddNodePickerAnchorRect = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>
type AddNodePickerAnchor = { clientX?: number; clientY?: number; anchorRect?: AddNodePickerAnchorRect }
type AddNodePickerAnchorPoint = { x: number; y: number }
type AddNodePickerSecondarySide = 'right' | 'left'
type GlobalAddNodeDragPayload =
  | { kind: 'logic'; nodeType: WorkflowNodeType; defaults?: Record<string, unknown> }
  | { kind: 'plugin'; pluginId: string; action: string; actionName: string }

defineProps<{
  showLogs?: boolean
}>()

defineEmits<{
  (event: 'update:show-logs', value: boolean): void
}>()

const workflowStore = useWorkflowStore()
const workflowBaseCanvasRef = ref<WorkflowBaseCanvasPublicApi | null>(null)
const { data: workflowNodeCatalog, execute: loadWorkflowNodeCatalog } = useApi(workflowNodesApi.getCatalog)

const DEFAULT_ALLOWED_NODES_BY_HANDLER: Record<string, AllowedNodes> = {
  chatModel: ['capability:chat-model'],
  memory: ['preset:sqlite-memory', 'capability:memory-store'],
  tool: ['capability:agent-tool'],
  embedding: ['capability:embedding-model'],
  document: ['node:file-dataset', 'node:text-dataset', 'node:database-dataset'],
  data: ['node:file-dataset', 'node:text-dataset', 'node:database-dataset'],
}
const ADD_NODE_PICKER_COLUMN_WIDTH = 288
const ADD_NODE_PICKER_GAP = 8
const ADD_NODE_PICKER_CASCADE_WIDTH = ADD_NODE_PICKER_COLUMN_WIDTH * 2 + ADD_NODE_PICKER_GAP
const ADD_NODE_PICKER_HEIGHT = 458
const ADD_NODE_PICKER_MARGIN = 12
const QUICK_ADD_NODE_VERTICAL_OFFSET = 50

const addNodePickerOverlay = ref<{
  left: number
  top: number
  secondarySide: AddNodePickerSecondarySide
  handlerId: string | null
  allowedNodes: AllowedNodes
  quickAddAnchorPoint: AddNodePickerAnchorPoint | null
} | null>(null)

const isWorkflowEmpty = computed(() => {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return false
  return Object.keys(workflow.nodes).length === 0 && workflow.edges.length === 0
})
const addNodePickerStyle = computed(() => ({
  left: `${addNodePickerOverlay.value?.left ?? ADD_NODE_PICKER_MARGIN}px`,
  top: `${addNodePickerOverlay.value?.top ?? ADD_NODE_PICKER_MARGIN}px`,
}))

watch(workflowNodeCatalog, (catalog) => replaceNodeDefinitions(catalog?.nodes ?? []), {
  immediate: true,
})

onMounted(() => loadWorkflowNodeCatalog())

useEventBus<{
  sourceId?: string
  sourceHandle?: string
  targetId?: string
  targetHandle?: string
  handlerId?: string
  allowedNodes?: AllowedNodes
  clientX?: number
  clientY?: number
  anchorRect?: AddNodePickerAnchorRect
}>('node:quick-add').on((payload) => {
  const handlerId = payload?.handlerId ?? payload?.targetHandle ?? null
  openAddNodePanel(
    payload?.sourceId ?? null,
    handlerId,
    payload,
    payload?.allowedNodes ?? DEFAULT_ALLOWED_NODES_BY_HANDLER[handlerId ?? ''] ?? '*',
  )
})

useEventBus<{
  edgeId: string
  sourceId: string
  targetId: string
  sourceHandle?: string
  targetHandle?: string
  clientX?: number
  clientY?: number
  anchorRect?: AddNodePickerAnchorRect
}>('edge:quick-add-between').on((payload) => {
  openAddNodePanel(payload?.sourceId ?? null, null, payload, '*')
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function getAddNodePickerPosition(anchor?: AddNodePickerAnchor | null): { left: number; top: number; secondarySide: AddNodePickerSecondarySide } {
  const anchorRect = anchor?.anchorRect
  const fallback = { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }
  const point =
    typeof anchor?.clientX === 'number' && typeof anchor.clientY === 'number'
      ? { clientX: anchor.clientX, clientY: anchor.clientY }
      : fallback
  const rightSpace = anchorRect ? window.innerWidth - anchorRect.right : window.innerWidth - point.clientX
  const leftSpace = anchorRect ? anchorRect.left : point.clientX
  const secondarySide: AddNodePickerSecondarySide =
    rightSpace >= ADD_NODE_PICKER_CASCADE_WIDTH || rightSpace >= leftSpace ? 'right' : 'left'
  const bottomAlignedTop = window.innerHeight - ADD_NODE_PICKER_HEIGHT - ADD_NODE_PICKER_MARGIN
  const preferredTop = anchorRect ? anchorRect.top : point.clientY - 24
  const preferredRight = anchorRect ? anchorRect.right + ADD_NODE_PICKER_MARGIN : point.clientX + ADD_NODE_PICKER_MARGIN
  const preferredLeft = anchorRect
    ? anchorRect.left - ADD_NODE_PICKER_COLUMN_WIDTH - ADD_NODE_PICKER_MARGIN
    : point.clientX - ADD_NODE_PICKER_COLUMN_WIDTH - ADD_NODE_PICKER_MARGIN

  return {
    left: secondarySide === 'right'
      ? clamp(preferredRight, ADD_NODE_PICKER_MARGIN, window.innerWidth - ADD_NODE_PICKER_CASCADE_WIDTH - ADD_NODE_PICKER_MARGIN)
      : clamp(preferredLeft, ADD_NODE_PICKER_MARGIN + ADD_NODE_PICKER_COLUMN_WIDTH + ADD_NODE_PICKER_GAP, window.innerWidth - ADD_NODE_PICKER_COLUMN_WIDTH - ADD_NODE_PICKER_MARGIN),
    top: clamp(preferredTop, ADD_NODE_PICKER_MARGIN, bottomAlignedTop),
    secondarySide,
  }
}

function getQuickAddAnchorPoint(anchor?: AddNodePickerAnchor | null): AddNodePickerAnchorPoint | null {
  if (typeof anchor?.clientX === 'number' && typeof anchor.clientY === 'number') {
    return { x: anchor.clientX, y: anchor.clientY - QUICK_ADD_NODE_VERTICAL_OFFSET }
  }
  if (anchor?.anchorRect) {
    return {
      x: anchor.anchorRect.right,
      y: anchor.anchorRect.top + anchor.anchorRect.height / 2 - QUICK_ADD_NODE_VERTICAL_OFFSET,
    }
  }
  return null
}

function openAddNodePanel(
  sourceId?: string | null,
  handlerId?: string | null,
  anchor?: AddNodePickerAnchor | null,
  allowedNodes: AllowedNodes = '*',
) {
  const quickAddAnchorPoint = getQuickAddAnchorPoint(anchor)
  workflowBaseCanvasRef.value?.openAddNodePanel(sourceId, handlerId, quickAddAnchorPoint)
  const position = getAddNodePickerPosition(anchor)
  addNodePickerOverlay.value = {
    ...position,
    handlerId: handlerId ?? null,
    allowedNodes,
    quickAddAnchorPoint,
  }
}

function openAddNodePanelFromEvent(event: MouseEvent, sourceId?: string | null, handlerId?: string | null) {
  openAddNodePanel(sourceId, handlerId, {
    clientX: event.clientX,
    clientY: event.clientY,
    anchorRect: (event.currentTarget as HTMLElement).getBoundingClientRect(),
  }, handlerId ? DEFAULT_ALLOWED_NODES_BY_HANDLER[handlerId] ?? '*' : '*')
}

function closeAddNodePicker() {
  addNodePickerOverlay.value = null
}

function addLogicNode(type: WorkflowNodeType, defaults: Record<string, unknown> = {}) {
  const point = addNodePickerOverlay.value?.quickAddAnchorPoint
  const id = point
    ? workflowBaseCanvasRef.value?.addLogicNodeAtScreenPoint(type, point, defaults)
    : workflowBaseCanvasRef.value?.addLogicNodeAtViewportCenter(type, defaults)
  closeAddNodePicker()
  return id
}

function addPluginNode(pluginId: string, action: string, actionName: string) {
  const point = addNodePickerOverlay.value?.quickAddAnchorPoint
  const id = point
    ? workflowBaseCanvasRef.value?.addPluginNodeAtScreenPoint(pluginId, action, actionName, point)
    : workflowBaseCanvasRef.value?.addPluginNodeAtViewportCenter(pluginId, action, actionName)
  closeAddNodePicker()
  return id
}

function addAgentToolNode(pluginId: string, action: string, actionName: string) {
  return addLogicNode('ai-tool' as WorkflowNodeType, {
    name: actionName,
    pluginId,
    methodId: action,
  })
}

function addLogicNodeAtViewportCenter(type: WorkflowNodeType, defaults: Record<string, unknown> = {}) {
  return workflowBaseCanvasRef.value?.addLogicNodeAtViewportCenter(type, defaults)
}

function addPluginNodeAtViewportCenter(pluginId: string, action: string, actionName: string) {
  return workflowBaseCanvasRef.value?.addPluginNodeAtViewportCenter(pluginId, action, actionName)
}

function addLogicNodeAtScreenPoint(type: WorkflowNodeType, point: { x: number; y: number }, defaults: Record<string, unknown> = {}) {
  return workflowBaseCanvasRef.value?.addLogicNodeAtScreenPoint(type, point, defaults)
}

function addPluginNodeAtScreenPoint(pluginId: string, action: string, actionName: string, point: { x: number; y: number }) {
  return workflowBaseCanvasRef.value?.addPluginNodeAtScreenPoint(pluginId, action, actionName, point)
}

function handleGlobalAddNodeDrop(event: DragEvent) {
  const raw = event.dataTransfer?.getData('application/x-sailor-add-node')
  if (!raw) return

  event.preventDefault()
  const point = { x: event.clientX, y: event.clientY }

  try {
    const payload = JSON.parse(raw) as GlobalAddNodeDragPayload
    if (payload.kind === 'logic') addLogicNodeAtScreenPoint(payload.nodeType, point, payload.defaults)
    if (payload.kind === 'plugin') addPluginNodeAtScreenPoint(payload.pluginId, payload.action, payload.actionName, point)
  } catch {
    return
  }
}

function handleRun() {
  return workflowBaseCanvasRef.value?.handleRun()
}

function handleStop() {
  return workflowBaseCanvasRef.value?.handleStop()
}

defineExpose({
  handleRun,
  handleStop,
  openAddNodePanel,
  addLogicNodeAtViewportCenter,
  addPluginNodeAtViewportCenter,
  addLogicNodeAtScreenPoint,
  addPluginNodeAtScreenPoint,
  selectAllNodes: () => workflowBaseCanvasRef.value?.selectAllNodes(),
  clearSelection: () => workflowBaseCanvasRef.value?.clearSelection(),
  duplicateSelection: () => workflowBaseCanvasRef.value?.duplicateSelection(),
  deleteSelection: () => workflowBaseCanvasRef.value?.deleteSelection(),
  zoomIn: () => workflowBaseCanvasRef.value?.zoomIn(),
  zoomOut: () => workflowBaseCanvasRef.value?.zoomOut(),
  zoomReset: () => workflowBaseCanvasRef.value?.zoomReset(),
  fitWorkflowView: () => workflowBaseCanvasRef.value?.fitWorkflowView(),
})
</script>

<template>
  <div
    class="sailor-workflow-canvas sailor-fill"
    @dragover.prevent
    @drop="handleGlobalAddNodeDrop"
  >
    <WorkflowBaseCanvas ref="workflowBaseCanvasRef" />

    <button
      v-if="isWorkflowEmpty"
      class="canvas-empty-step"
      type="button"
      @click.stop="(event) => openAddNodePanelFromEvent(event, null, null)"
    >
      <span class="canvas-empty-step__box">
        <LucideIcon name="plus" :size="34" />
      </span>
      <span class="canvas-empty-step__label">Add first step...</span>
    </button>

    <div
      v-if="addNodePickerOverlay"
      class="add-node-picker-overlay"
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
          :handler-id="addNodePickerOverlay.handlerId ?? undefined"
          :allowed-nodes="addNodePickerOverlay.allowedNodes"
          :secondary-side="addNodePickerOverlay.secondarySide"
        />
      </div>
    </div>

    <NodeInspectorModal />
  </div>
</template>

<style scoped>
.sailor-workflow-canvas {
  position: relative;
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
</style>
