<template>
  <div class="sailor-workflow-base-canvas-shell">
    <BaseCanvas
      v-model:viewport="viewport"
      v-model:selection="canvasSelection"
      :items="workflowItems"
      :snap-to-grid="true"
      :grid-size="20"
      :marquee-selection="true"
      background-color="var(--sailor-canvas-bg)"
      pattern-color="var(--sailor-canvas-grid)"
      pattern-style="dot"
      :pattern-size="20"
      class="sailor-workflow-base-canvas"
      :data-workflow-items-count="workflowItems.length"
      @items-move="handleItemsMove"
    >
      <template #item="{ item }">
        <WorkflowCanvasNodeHost
          :item="item"
          :component="nodeComponentByType[resolveNodeType(item)]"
          :selected="canvasSelection.includes(item.id)"
          :status="resolveNodeStatus(item.id)"
          :has-outgoing-connection="hasNodeOutgoingConnection(item.id)"
          @open-inspector="openNodeInspector"
        />
      </template>
    </BaseCanvas>

    <WorkflowEdgeLayer
      :edges="workflowEdges"
      :items="workflowItems"
      :viewport="viewport"
      :handle-registry="handleRegistry"
    />

    <WorkflowConnectionLayer
      :edges="workflowEdges"
      :viewport="viewport"
      :handle-registry="handleRegistry"
      @connection-create="createWorkflowConnection"
      @connection-cancel="cancelWorkflowConnection"
    />

    <WorkflowSelectionBox
      :items="workflowItems"
      :selection="canvasSelection"
      :viewport="viewport"
      @duplicate-selection="duplicateSelection"
      @delete-selection="deleteSelection"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch, type Component } from 'vue'
import type { WorkflowEdge } from '@/core/types/workflow.types'
import { BaseCanvas } from '@/shared/base-canvas/components.ts'
import type {
  BaseCanvasItem,
  BaseCanvasItemsMoveEvent,
  BaseCanvasViewport,
} from '@/shared/base-canvas/index.ts'
import { useEventBus } from '@/shared/composables/useEventBus'
import { getAdvancedChildPosition, getAdvancedParentBounds } from '../layout/advancedNodeLayout'
import { useWorkflowStore } from '../stores/workflow.store'
import { useExecutionStore } from '../stores/execution.store'
import { useNodeInspectorStore } from '../stores/node-inspector.store'
import { deleteWorkflowSelection, duplicateWorkflowSelection } from '../utils/workflowSelectionActions'
import { shouldRenderLegacyTriggerNode } from '../utils/workflowRunTrigger'
import {
  createWorkflowConnectionEdge,
  getAdvancedNodeHandlersForCanvas,
  getWorkflowConnectionPolicyAction,
  getWorkflowTargetHandlePolicy,
} from '../workflow-canvas/workflowCanvasConnections'
import {
  normalizeWorkflowSelection,
  selectAllWorkflowNodeIds,
} from '../workflow-canvas/workflowCanvasSelection'
import { workflowToBaseCanvasItems } from '../workflow-canvas/workflowCanvasAdapter'
import WorkflowCanvasNodeHost from './WorkflowCanvasNodeHost.vue'
import WorkflowConnectionLayer from './WorkflowConnectionLayer.vue'
import WorkflowEdgeLayer from './WorkflowEdgeLayer.vue'
import WorkflowSelectionBox from './WorkflowSelectionBox.vue'
import {
  createWorkflowHandleRegistry,
  isWorkflowBaseCanvasHandleModeKey,
  workflowCanvasHandleRegistryKey,
} from '../workflow-canvas/workflowCanvasHandles'
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
import AiAgentNode from './nodes/AiAgentNode.vue'
import AiModelNode from './nodes/AiModelNode.vue'
import AiMemoryNode from './nodes/AiMemoryNode.vue'
import AiToolNode from './nodes/AiToolNode.vue'
import TextDatasetNode from './nodes/TextDatasetNode.vue'
import FileDatasetNode from './nodes/FileDatasetNode.vue'
import DatabaseDatasetNode from './nodes/DatabaseDatasetNode.vue'
import EmbeddingsNode from './nodes/EmbeddingsNode.vue'
import VectorStoreNode from './nodes/VectorStoreNode.vue'
import RetrieverNode from './nodes/RetrieverNode.vue'
import BasicLlmChainNode from './nodes/BasicLlmChainNode.vue'
import StructuredJsonParserNode from './nodes/StructuredJsonParserNode.vue'
import VectorStoreRetrieverNode from './nodes/VectorStoreRetrieverNode.vue'
import QuestionAnswerChainNode from './nodes/QuestionAnswerChainNode.vue'
import VectorStoreToolNode from './nodes/VectorStoreToolNode.vue'

const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()
const inspectorStore = useNodeInspectorStore()
const viewport = ref<BaseCanvasViewport>({ x: 0, y: 0, zoom: 1 })
const canvasSelection = ref<string[]>([])
const handleRegistry = createWorkflowHandleRegistry()
const nodeToolbarBus = useEventBus<{ action: 'duplicate' | 'delete' | 'disable'; nodeId: string }>(
  'node:toolbar-action',
)

provide(isWorkflowBaseCanvasHandleModeKey, true)
provide(workflowCanvasHandleRegistryKey, handleRegistry)

const nodeComponentByType: Record<string, Component> = {
  trigger: TriggerNode,
  http: HttpNode,
  code: CodeNode,
  loop: LoopNode,
  event: EventNode,
  'event-listener': EventListenerNode,
  plugin: PluginNode,
  if: IfNode,
  subworkflow: SubWorkflowNode,
  set: SetNode,
  switch: SwitchNode,
  merge: MergeNode,
  'split-in-batches': SplitInBatchesNode,
  'respond-webhook': RespondToWebhookNode,
  'wait-form': WaitFormNode,
  'ai-agent': AiAgentNode,
  'ai-model': AiModelNode,
  'ai-memory': AiMemoryNode,
  'ai-tool': AiToolNode,
  'text-dataset': TextDatasetNode,
  'file-dataset': FileDatasetNode,
  'database-dataset': DatabaseDatasetNode,
  embeddings: EmbeddingsNode,
  'vector-store': VectorStoreNode,
  retriever: RetrieverNode,
  'basic-llm-chain': BasicLlmChainNode,
  'structured-json-parser': StructuredJsonParserNode,
  'vector-store-retriever': VectorStoreRetrieverNode,
  'question-answer-chain': QuestionAnswerChainNode,
  'vector-store-tool': VectorStoreToolNode,
}

const workflowItems = computed(() => {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return []
  return workflowToBaseCanvasItems(workflow, {
    includeLegacyTrigger: shouldRenderLegacyTriggerNode(workflow),
  })
})

const workflowEdges = computed(() => workflowStore.activeWorkflow?.edges ?? [])
const selectableNodeIds = computed(() => ({
  includeTrigger: workflowItems.value.some((item) => item.id === 'trigger'),
  nodeIds: Object.keys(workflowStore.activeWorkflow?.nodes ?? {}),
}))

nodeToolbarBus.on(handleNodeToolbarAction)

watch([workflowItems, canvasSelection], () => {
  const normalized = normalizeWorkflowSelection({
    ...selectableNodeIds.value,
    selection: canvasSelection.value,
  })
  if (normalized.join('|') !== canvasSelection.value.join('|')) {
    canvasSelection.value = normalized
  }
}, { flush: 'post' })

onMounted(() => {
  window.addEventListener('keydown', handleWorkflowCanvasKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWorkflowCanvasKeyDown)
})

function resolveNodeType(item: BaseCanvasItem): string {
  if (item.id === 'trigger') return 'trigger'
  return String((item.data as { type?: string } | undefined)?.type ?? '')
}

function resolveNodeStatus(nodeId: string) {
  return executionStore.nodeStatuses[nodeId]?.status ?? 'idle'
}

function hasNodeOutgoingConnection(nodeId: string): boolean {
  return workflowStore.activeWorkflow?.edges.some((edge) => edge.source === nodeId) ?? false
}

function handleItemsMove(event: BaseCanvasItemsMoveEvent) {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return

  for (const itemId of event.itemIds) {
    const node = itemId === 'trigger' ? workflow.trigger : workflow.nodes[itemId]
    if (!node) continue

    node.ui = {
      ...node.ui,
      positionX: (node.ui?.positionX ?? 0) + event.delta.x,
      positionY: (node.ui?.positionY ?? 0) + event.delta.y,
    }
  }
}

function selectAllNodes() {
  canvasSelection.value = selectAllWorkflowNodeIds(selectableNodeIds.value)
}

function clearSelection() {
  canvasSelection.value = []
}

function deleteSelection() {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return
  const result = deleteWorkflowSelection(workflow, canvasSelection.value)
  if (result.nodeIds.length === 0) return
  canvasSelection.value = []
}

function duplicateSelection() {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return
  const result = duplicateWorkflowSelection(workflow, canvasSelection.value)
  if (result.nodeIds.length === 0) return
  canvasSelection.value = result.nodeIds
}

function handleNodeToolbarAction(payload: { action: 'duplicate' | 'delete' | 'disable'; nodeId: string } | undefined) {
  if (!payload) return
  if (payload.action === 'duplicate') duplicateNodeFromToolbar(payload.nodeId)
  if (payload.action === 'delete') deleteNodeFromToolbar(payload.nodeId)
  if (payload.action === 'disable') toggleNodeDisabled(payload.nodeId)
}

function duplicateNodeFromToolbar(nodeId: string) {
  canvasSelection.value = [nodeId]
  duplicateSelection()
}

function deleteNodeFromToolbar(nodeId: string) {
  canvasSelection.value = [nodeId]
  deleteSelection()
}

function toggleNodeDisabled(nodeId: string) {
  const node = workflowStore.activeWorkflow?.nodes[nodeId]
  if (!node) return
  node.disabled = !node.disabled
}

function handleWorkflowCanvasKeyDown(event: KeyboardEvent) {
  if (isEditableKeyTarget(event.target)) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault()
    selectAllNodes()
    return
  }
  if (event.key === 'Escape') {
    clearSelection()
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    deleteSelection()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault()
    duplicateSelection()
  }
}

function isEditableKeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function createWorkflowConnection(connection: Pick<WorkflowEdge, 'source' | 'target' | 'sourceHandle' | 'targetHandle'>) {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return

  const targetHandle = connection.targetHandle ?? 'target'
  const policy = getWorkflowTargetHandlePolicy(workflow, connection.target, targetHandle)
  const connectionCount = workflow.edges.filter((edge) =>
    edge.target === connection.target &&
    (edge.targetHandle ?? 'target') === policy.id,
  ).length

  if (getWorkflowConnectionPolicyAction(policy, connectionCount) === 'replace') {
    workflow.edges = workflow.edges.filter((edge) =>
      !(edge.target === connection.target && (edge.targetHandle ?? 'target') === policy.id),
    )
  }

  workflow.edges.push(createWorkflowConnectionEdge(connection))
  arrangeAdvancedConfigNodes(connection.target)
}

function cancelWorkflowConnection() {
  // The BaseCanvas connection path owns no external draft state yet.
}

function arrangeAdvancedConfigNodes(targetId: string, visited = new Set<string>()) {
  const workflow = workflowStore.activeWorkflow
  if (!workflow || visited.has(targetId)) return
  visited.add(targetId)

  const targetItem = workflowItems.value.find((item) => item.id === targetId)
  if (!targetItem) return

  const handlers = getAdvancedNodeHandlersForCanvas(workflow, targetId)
  handlers.forEach((handler, handlerIndex) => {
    const edges = workflow.edges.filter((edge) =>
      edge.target === targetId && edge.targetHandle === handler.id,
    )
    edges.forEach((edge, siblingIndex) => {
      const sourceNode = workflow.nodes[edge.source]
      if (!sourceNode) return

      const position = getAdvancedChildPosition({
        parent: getAdvancedParentBounds({ x: targetItem.x, y: targetItem.y }, {
          width: targetItem.width ?? 236,
          height: targetItem.height ?? 100,
        }),
        side: handler.position,
        handlerIndex,
        handlerCount: handlers.length,
        siblingIndex,
      })

      sourceNode.ui = {
        ...sourceNode.ui,
        positionX: position.x,
        positionY: position.y,
      }
      arrangeAdvancedConfigNodes(edge.source, visited)
    })
  })
}

function openNodeInspector(item: BaseCanvasItem) {
  inspectorStore.openInspector({
    id: item.id,
    type: resolveNodeType(item),
    position: { x: item.x, y: item.y },
    data: item.data,
  } as any)
}

defineExpose({
  selectAllNodes,
  clearSelection,
  duplicateSelection,
  deleteSelection,
})
</script>

<style scoped>
.sailor-workflow-base-canvas-shell {
  position: relative;
  width: 100%;
  height: 100%;
}

.sailor-workflow-base-canvas {
  width: 100%;
  height: 100%;
}
</style>
