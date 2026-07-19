<template>
  <PageBlueprintShell>
    <BaseCanvas
      v-model:selection="selection"
      v-model:viewport="viewport"
      class="web-page-blueprint-v2__canvas"
      :class="{ 'web-page-blueprint-v2__canvas--connecting': pendingOutput }"
      :items="canvasItems"
      pattern-style="square"
      :pattern-size="24"
      :grid-size="24"
      @items-move="moveCanvasItems"
      @item-drag-start="startCanvasDragHistory"
      @item-drag-end="finishCanvasDragHistory"
      @pointermove="updatePendingPointer"
      @pointerleave="clearPendingPointer"
    >
      <PageBlueprintConnectionLayer
        :nodes="connectionNodes"
        :connections="document.connections"
        :port-points="portPoints"
        :pending-output="pendingOutput"
        :pointer="pendingPointer"
        @remove-connection="blueprintStore.removeConnection"
      />

      <PageBlueprintSelectionBox
        :items="canvasItems"
        :selection="selection"
        :viewport="viewport"
        :grid-size="24"
        :snap-to-grid="true"
        @selection-move="moveCanvasItems"
        @selection-drag-start="startCanvasDragHistory"
        @selection-drag-end="finishCanvasDragHistory"
        @create-group="createGroupFromSelection"
        @duplicate-selection="duplicateSelection"
        @delete-selection="deleteSelection"
        @create-component="createComponentFromSelection"
      />

      <BaseComponentGroup
        v-for="group in canvasGroups"
        :key="group.id"
        :name="group.name"
        :child-count="group.childCount"
        :x="group.x"
        :y="group.y"
        :width="group.width"
        :height="group.height"
        :selected="group.nodeIds.some((id) => selection.includes(id))"
        @drag-start="startGroupDrag(group.nodeIds, $event)"
      />

      <template #item="{ item, selected }">
        <NodeFloatingToolbar
          v-if="canManageNode(item)"
          :selected="selected"
          @duplicate="duplicateCanvasNode(item.id)"
          @remove="deleteCanvasNode(item.id)"
        />
        <UtilityNodeRenderer
          v-if="itemData(item).kind === 'utility' && itemData(item).utilityNode"
          :node="itemData(item).utilityNode!"
          :selected="selected"
          :dimmed="isNodeDimmed(item.id)"
          @pick-output="(fieldId, event) => startFieldConnection(item.id, fieldId, event)"
          @pick-input="(fieldId, event) => completeFieldConnection(item.id, fieldId, event)"
          @update-mode="(fieldId, mode) => blueprintStore.setNodeFieldMode(item.id, fieldId, mode)"
        />
        <PageComponentNode
          v-else-if="itemData(item).kind === 'component' && itemData(item).componentNode"
          :node-id="item.id"
          :title="itemData(item).componentNode!.label"
          :fields="itemData(item).componentNode!.fields"
          :selected="selected"
          :dimmed="isNodeDimmed(item.id)"
          @pick-output="(fieldId, event) => startFieldConnection(item.id, fieldId, event)"
          @pick-input="(fieldId, event) => completeFieldConnection(item.id, fieldId, event)"
          @update-mode="(fieldId, mode) => blueprintStore.setNodeFieldMode(item.id, fieldId, mode)"
        />
        <BaseElement
          v-else
          :title="itemData(item).title"
          :eyebrow="itemData(item).eyebrow"
          :icon="itemData(item).icon"
          :detail="itemData(item).detail"
          :meta="itemData(item).meta"
          :accent="itemData(item).accent"
          :selected="selected"
          :dimmed="isNodeDimmed(item.id)"
        >
          <BlueprintNodeFields
            :node-id="item.id"
            :fields="itemData(item).fields"
            @pick-output="(fieldId, event) => startFieldConnection(item.id, fieldId, event)"
            @pick-input="(fieldId, event) => completeFieldConnection(item.id, fieldId, event)"
            @update-mode="(fieldId, mode) => blueprintStore.setNodeFieldMode(item.id, fieldId, mode)"
          />
        </BaseElement>
      </template>
    </BaseCanvas>
  </PageBlueprintShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type {
  PageActionCollectionBinding,
  PageActionOutputBinding,
  PageActionWorkflowSummary,
} from '@/core/page-actions'
import { BaseCanvas } from '@/shared/base-canvas/components.ts'
import type { BaseCanvasItem, BaseCanvasItemsMoveEvent, BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import type { PageBlock } from '../types/page.types.ts'
import {
  createElementFields,
  type PageBlueprintDisplayField,
} from './pageBlueprintFields.ts'
import { pageBlockIcon } from './pageBlueprintGroups.ts'
import { usePageBlueprintStore } from './pageBlueprint.store.ts'
import { createBlueprintEventLabel } from './pageBlueprintEventLabels.ts'
import { getPageBlueprintNodeDefinition } from './pageBlueprintNodeRegistry.ts'
import {
  buildPageBlockParentMap,
  collectionFieldIdFromItemFieldId,
  isBlueprintItemFieldId,
  isBlueprintRepeatFieldId,
  isBlueprintRepeatSourceField,
  isPageBlockDescendantOf,
  sourceBelongsToRepeatBinding,
} from './pageBlueprintRepeaters.ts'
import type {
  PageBlueprintConnection,
  PageBlueprintConnectionEndpoint,
  PageBlueprintField,
  PageBlueprintNode,
  PageBlueprintComponent,
  PageBlueprintComponentNode,
  PageBlueprintGroup,
  PageBlueprintUtilityNode,
} from './pageBlueprintSchema.ts'
import { createPageBlueprintViewModel, type PageBlueprintViewModel } from './pageBlueprintViewModel.ts'
import BaseComponentGroup from './components/BaseComponentGroup.vue'
import BaseElement from './components/BaseElement.vue'
import BlueprintNodeFields from './components/BlueprintNodeFields.vue'
import NodeFloatingToolbar from './components/NodeFloatingToolbar.vue'
import PageComponentNode from './components/PageComponentNode.vue'
import PageBlueprintConnectionLayer, {
  type PageBlueprintConnectionNode,
} from './components/PageBlueprintConnectionLayer.vue'
import PageBlueprintSelectionBox from './components/PageBlueprintSelectionBox.vue'
import PageBlueprintShell from './components/PageBlueprintShell.vue'
import UtilityNodeRenderer from './components/UtilityNodeRenderer.vue'

type PageBlueprintCanvasItemKind = 'element' | 'utility' | 'component' | 'empty'

interface PageBlueprintCanvasItemData {
  kind: PageBlueprintCanvasItemKind
  title: string
  eyebrow: string
  detail: string
  meta: string
  icon: string
  accent: string
  showFooter: boolean
  fields: PageBlueprintDisplayField[]
  elementId?: string
  utilityNode?: PageBlueprintUtilityNode
  componentNode?: PageBlueprintComponentNode
}

interface PageBlueprintCanvasItem extends BaseCanvasItem {
  data: PageBlueprintCanvasItemData
}

const props = defineProps<{
  blocks: PageBlock[]
  workflows: PageActionWorkflowSummary[]
  outputBindings: Record<string, PageActionOutputBinding[]>
  collectionBindings: Record<string, PageActionCollectionBinding[]>
}>()

const emit = defineEmits<{
  selectNode: [nodeId: string | null]
  createComponent: [nodeIds: string[]]
}>()

const selection = ref<string[]>([])
const blueprintStore = usePageBlueprintStore()
const { document } = storeToRefs(blueprintStore)
const pendingOutput = ref<PageBlueprintConnectionEndpoint | null>(null)
const pendingPointer = ref<{ x: number; y: number } | null>(null)
const activePointerId = ref<number | null>(null)
const portPoints = ref<Record<string, { x: number; y: number }>>({})
const viewport = computed<BaseCanvasViewport>({
  get: () => document.value.viewport,
  set: (nextViewport) => blueprintStore.setViewport(nextViewport),
})
const groupDrag = ref<null | { nodeIds: string[]; pointerId: number; x: number; y: number }>(null)

const model = computed(() => createPageBlueprintViewModel({
  blocks: props.blocks,
  workflows: props.workflows,
  outputBindings: props.outputBindings,
  collectionBindings: props.collectionBindings,
}))

const canvasItems = computed<PageBlueprintCanvasItem[]>(() => {
  const items = createCanvasItems(model.value, document.value.nodes.filter(isUtilityNode), document.value.connections)
  return items.map((item) => ({
    ...item,
    ...(document.value.nodeLayouts[item.id] ?? {}),
  }))
})

const canvasGroups = computed(() => [
  ...buildSavedGroups(document.value.groups, canvasItems.value),
  ...buildComponentGroups(document.value.components, canvasItems.value),
])
const blockParentMap = computed(() => buildPageBlockParentMap(props.blocks))
const connectionNodes = computed<PageBlueprintConnectionNode[]>(() =>
  canvasItems.value
    .filter((item) => itemData(item).kind !== 'empty')
    .map((item) => ({
      id: item.id,
      x: item.x,
      y: item.y,
      width: item.width ?? 0,
      height: item.height ?? 0,
      fields: connectionFields(item),
    }))
    .filter((node) => node.width > 0 && node.height > 0 && node.fields.length > 0),
)

onMounted(() => {
  void nextTick(measurePorts)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', moveGroupDrag)
  window.removeEventListener('pointercancel', stopGroupDrag)
  window.removeEventListener('pointermove', movePendingConnection)
  window.removeEventListener('pointerup', cancelPendingConnection)
  window.removeEventListener('pointercancel', cancelPendingConnection)
})

watch(selection, (nextSelection) => {
  emit('selectNode', nextSelection.length === 1 ? (nextSelection[0] ?? null) : null)
})

watch(canvasItems, () => {
  void nextTick(measurePorts)
}, { flush: 'post' })

function moveCanvasItems(event: BaseCanvasItemsMoveEvent) {
  const itemsById = new Map(canvasItems.value.map((item) => [item.id, item]))
  const nextPositions: Record<string, { x: number; y: number }> = {}

  for (const itemId of event.itemIds) {
    const item = itemsById.get(itemId)
    if (!item) continue
    nextPositions[itemId] = {
      x: item.x + event.delta.x,
      y: item.y + event.delta.y,
    }
  }

  blueprintStore.setNodePositions(nextPositions, { history: false })
}

function startGroupDrag(nodeIds: string[], event: PointerEvent) {
  if (event.button !== 0) return
  startCanvasDragHistory()
  selection.value = [...nodeIds]
  groupDrag.value = { nodeIds: [...nodeIds], pointerId: event.pointerId, x: event.clientX, y: event.clientY }
  window.addEventListener('pointermove', moveGroupDrag)
  window.addEventListener('pointerup', stopGroupDrag, { once: true })
  window.addEventListener('pointercancel', stopGroupDrag, { once: true })
}

function moveGroupDrag(event: PointerEvent) {
  const drag = groupDrag.value
  if (!drag || drag.pointerId !== event.pointerId) return

  const delta = {
    x: (event.clientX - drag.x) / viewport.value.zoom,
    y: (event.clientY - drag.y) / viewport.value.zoom,
  }

  groupDrag.value = { ...drag, x: event.clientX, y: event.clientY }
  moveCanvasItems({ itemIds: drag.nodeIds, delta })
}

function stopGroupDrag() {
  groupDrag.value = null
  window.removeEventListener('pointermove', moveGroupDrag)
  window.removeEventListener('pointercancel', stopGroupDrag)
  finishCanvasDragHistory()
}

function startCanvasDragHistory() {
  blueprintStore.beginHistoryBatch()
}

function finishCanvasDragHistory() {
  blueprintStore.commitHistoryBatch()
  void nextTick(measurePorts)
}

function createCanvasItems(
  viewModel: PageBlueprintViewModel,
  utilityNodes: PageBlueprintUtilityNode[],
  connections: PageBlueprintConnection[],
): PageBlueprintCanvasItem[] {
  const blueprintElementsById = new Map(
    document.value.nodes
      .filter((node) => node.kind === 'element')
      .map((node) => [node.id, node]),
  )
  const elementItems = viewModel.elements
    .filter((element) => blueprintElementsById.has(elementNodeId(element.id)))
    .map((element, index) => {
      const nodeId = elementNodeId(element.id)
      const blueprintElement = blueprintElementsById.get(nodeId)
      const fields = mergeElementFields(
        blueprintElementFields(blueprintElement?.fields ?? []),
        createElementFields(element),
      )
      return {
        id: nodeId,
        x: 40,
        y: 40 + index * 128,
        width: 244,
        height: nodeHeight(fields.length),
        data: {
          kind: 'element' as const,
          title: elementNodeTitle(blueprintElement, element),
          eyebrow: element.events.length > 0 ? 'Element Event' : 'Page Element',
          detail: `${element.events.length} event(s) on ${element.tag}`,
          meta: shortId(element.id),
          icon: pageBlockIcon(element.tag),
          accent: 'var(--fabric-blue-400)',
          showFooter: true,
          fields: withConnectionValues(nodeId, fields, connections),
          elementId: element.id,
        },
      }
    })

  const utilityItems = utilityNodes.map((node, index) => {
    const definition = getPageBlueprintNodeDefinition(node.type)
    const utilityNode = withUtilityConnectionValues(node, connections)
    return {
      id: node.id,
      x: 1040,
      y: 40 + index * 148,
      width: definition?.width ?? 280,
      height: utilityNodeHeight(utilityNode.fields.length),
      data: {
        kind: 'utility' as const,
        title: node.label,
        eyebrow: 'Utility Node',
        detail: node.type,
        meta: '',
        icon: node.icon ?? definition?.icon ?? 'box',
        accent: node.accent ?? definition?.accent ?? 'var(--fabric-accent)',
        showFooter: false,
        fields: [],
        utilityNode,
      },
    }
  })

  const componentItems = document.value.nodes
    .filter((node): node is PageBlueprintComponentNode => node.kind === 'component')
    .map((node, index) => ({
      id: node.id,
      x: 700,
      y: 60 + index * 168,
      width: 300,
      height: componentNodeHeight(node.fields.length),
      data: {
        kind: 'component' as const,
        title: node.label,
        eyebrow: 'Page Component',
        detail: `${node.fields.length} exposed field(s)`,
        meta: '',
        icon: node.icon ?? 'component',
        accent: node.accent ?? 'var(--fabric-accent)',
        showFooter: false,
        fields: [],
        componentNode: withComponentConnectionValues(node, connections),
      },
    }))

  const items = [...elementItems, ...utilityItems, ...componentItems]
  if (items.length > 0) return items

  return [{
    id: 'blueprint-empty',
    x: 40,
    y: 40,
    width: 280,
    height: 96,
    locked: true,
    data: {
      kind: 'empty',
      title: 'No events yet',
      eyebrow: 'Blueprint',
      detail: 'Add events from Inspector > Advanced.',
      meta: '',
      icon: 'mouse-pointer-click',
      accent: 'var(--fabric-text-muted)',
      showFooter: false,
      fields: [{
        id: 'hint',
        label: 'Inspector > Advanced',
        value: 'Add an event to start the Blueprint.',
      }],
    },
  }]
}

function itemData(item: BaseCanvasItem): PageBlueprintCanvasItemData {
  return item.data as PageBlueprintCanvasItemData
}

function startFieldConnection(nodeId: string, fieldId: string, event: PointerEvent) {
  if (event.button !== 0) return
  pendingOutput.value = { nodeId, fieldId }
  activePointerId.value = event.pointerId
  updatePendingPointer(event)
  window.addEventListener('pointermove', movePendingConnection)
  window.addEventListener('pointerup', cancelPendingConnection, { once: true })
  window.addEventListener('pointercancel', cancelPendingConnection, { once: true })
}

function completeFieldConnection(nodeId: string, fieldId: string, event: PointerEvent) {
  if (!pendingOutput.value) {
    blueprintStore.removeInputConnection(nodeId, fieldId)
    return
  }
  if (activePointerId.value !== event.pointerId) return
  if (!canConnectFields(pendingOutput.value, { nodeId, fieldId })) {
    stopPendingConnection()
    return
  }
  blueprintStore.connectFields(pendingOutput.value, { nodeId, fieldId })
  stopPendingConnection()
}

function movePendingConnection(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId) return
  updatePendingPointer(event)
}

function updatePendingPointer(event: PointerEvent) {
  if (!pendingOutput.value) return
  const canvasElement = window.document.querySelector('.web-page-blueprint-v2__canvas')
  const rect = canvasElement?.getBoundingClientRect()
  if (!rect) return
  pendingPointer.value = {
    x: (event.clientX - rect.left - viewport.value.x) / viewport.value.zoom,
    y: (event.clientY - rect.top - viewport.value.y) / viewport.value.zoom,
  }
}

function measurePorts() {
  const canvasElement = window.document.querySelector('.web-page-blueprint-v2__canvas')
  const canvasRect = canvasElement?.getBoundingClientRect()
  if (!canvasElement || !canvasRect) return

  const nextPoints: Record<string, { x: number; y: number }> = {}
  const ports = canvasElement.querySelectorAll<HTMLElement>('[data-blueprint-port-node-id][data-blueprint-port-field-id][data-blueprint-port-side]')
  ports.forEach((port) => {
    const nodeId = port.dataset.blueprintPortNodeId
    const fieldId = port.dataset.blueprintPortFieldId
    const side = port.dataset.blueprintPortSide
    if (!nodeId || !fieldId || !side) return
    const rect = port.getBoundingClientRect()
    nextPoints[`${nodeId}:${fieldId}:${side}`] = {
      x: (rect.left + rect.width / 2 - canvasRect.left - viewport.value.x) / viewport.value.zoom,
      y: (rect.top + rect.height / 2 - canvasRect.top - viewport.value.y) / viewport.value.zoom,
    }
  })
  portPoints.value = nextPoints
}

function clearPendingPointer() {
  pendingPointer.value = null
}

function cancelPendingConnection(event?: PointerEvent) {
  if (event && activePointerId.value !== event.pointerId) return
  stopPendingConnection()
}

function stopPendingConnection() {
  pendingOutput.value = null
  pendingPointer.value = null
  activePointerId.value = null
  window.removeEventListener('pointermove', movePendingConnection)
  window.removeEventListener('pointerup', cancelPendingConnection)
  window.removeEventListener('pointercancel', cancelPendingConnection)
}

function canManageNode(item: BaseCanvasItem) {
  const data = itemData(item)
  return (data.kind === 'utility' || data.kind === 'component') && document.value.nodes.some((node) => node.id === item.id)
}

function isNodeDimmed(nodeId: string) {
  if (!pendingOutput.value || pendingOutput.value.nodeId === nodeId) return false
  return !nodeHasCompatibleInput(nodeId, pendingOutput.value)
}

function duplicateCanvasNode(nodeId: string) {
  const nextNodeId = blueprintStore.duplicateNode(nodeId)
  if (nextNodeId) selection.value = [nextNodeId]
}

function duplicateSelection() {
  const nextSelection = selection.value
    .filter((nodeId) => canManageNodeId(nodeId))
    .map((nodeId) => blueprintStore.duplicateNode(nodeId))
    .filter((nodeId): nodeId is string => Boolean(nodeId))

  if (nextSelection.length > 0) selection.value = nextSelection
}

function deleteCanvasNode(nodeId: string) {
  blueprintStore.removeNode?.(nodeId) ?? blueprintStore.deleteNode(nodeId)
  selection.value = selection.value.filter((id) => id !== nodeId)
  if (pendingOutput.value?.nodeId === nodeId) {
    pendingOutput.value = null
    pendingPointer.value = null
  }
}

function deleteSelection() {
  const manageableNodeIds = selection.value.filter((nodeId) => canManageNodeId(nodeId))
  manageableNodeIds.forEach((nodeId) => {
    blueprintStore.removeNode?.(nodeId) ?? blueprintStore.deleteNode(nodeId)
  })
  selection.value = selection.value.filter((nodeId) => !manageableNodeIds.includes(nodeId))
  if (pendingOutput.value && manageableNodeIds.includes(pendingOutput.value.nodeId)) {
    pendingOutput.value = null
    pendingPointer.value = null
  }
}

function createComponentFromSelection() {
  if (selection.value.length < 2) return
  const componentNodeId = blueprintStore.createComponentFromSelection(selection.value, props.blocks)
  if (componentNodeId) {
    selection.value = [componentNodeId]
    emit('createComponent', [componentNodeId])
  }
}

function createGroupFromSelection() {
  blueprintStore.createGroupFromSelection(selection.value)
}

function canManageNodeId(nodeId: string) {
  const item = canvasItems.value.find((candidate) => candidate.id === nodeId)
  return Boolean(item && canManageNode(item))
}

function connectionFields(item: BaseCanvasItem) {
  const data = itemData(item)
  if (data.utilityNode) return data.utilityNode.fields.map((field) => ({ id: field.id }))
  if (data.componentNode) return data.componentNode.fields.map((field) => ({ id: field.id }))
  return data.fields.map((field) => ({ id: field.id }))
}

function nodeHasCompatibleInput(nodeId: string, from: PageBlueprintConnectionEndpoint) {
  return fieldsForNode(nodeId).some((field) => field.input && fieldsAreCompatible(from, { nodeId, fieldId: field.id }))
}

function canConnectFields(from: PageBlueprintConnectionEndpoint, to: PageBlueprintConnectionEndpoint) {
  if (from.nodeId === to.nodeId && from.fieldId === to.fieldId) return false
  return fieldsAreCompatible(from, to)
}

function fieldsAreCompatible(from: PageBlueprintConnectionEndpoint, to: PageBlueprintConnectionEndpoint) {
  const fromField = fieldForEndpoint(from)
  const toField = fieldForEndpoint(to)
  if (!fromField || !toField) return true
  if (fromField.type === 'event' || toField.type === 'event') return fromField.type === toField.type
  if (isBlueprintItemFieldId(from.fieldId)) return targetAcceptsItemField(from, to)
  if (isBlueprintRepeatSourceField(fromField)) return isBlueprintRepeatFieldId(to.fieldId)
  if (isBlueprintRepeatFieldId(to.fieldId)) return isBlueprintRepeatSourceField(fromField)
  return true
}

function fieldForEndpoint(endpoint: PageBlueprintConnectionEndpoint) {
  return fieldsForNode(endpoint.nodeId).find((field) => field.id === endpoint.fieldId) ?? null
}

function fieldsForNode(nodeId: string) {
  const item = canvasItems.value.find((candidate) => candidate.id === nodeId)
  if (!item) return []
  const data = itemData(item)
  if (data.utilityNode) {
    return data.utilityNode.fields.map((field) => ({
      id: field.id,
      type: field.type,
      mode: field.mode,
      input: field.direction === 'input' || field.direction === 'both',
      output: field.direction === 'output' || field.direction === 'both',
    }))
  }
  if (data.componentNode) {
    return data.componentNode.fields.map((field) => ({
      id: field.id,
      type: field.type,
      mode: field.mode,
      input: field.direction === 'input' || field.direction === 'both',
      output: field.direction === 'output' || field.direction === 'both',
    }))
  }
  return data.fields.map((field) => ({
    id: field.id,
    type: field.type,
    mode: field.mode,
    input: Boolean(field.input),
    output: Boolean(field.output),
  }))
}

function targetAcceptsItemField(from: PageBlueprintConnectionEndpoint, to: PageBlueprintConnectionEndpoint) {
  if (isBlueprintRepeatFieldId(to.fieldId)) return false
  const targetElementId = elementIdFromNodeId(to.nodeId)
  if (!targetElementId) return false
  const repeatBinding = document.value.repeatBindings.find((binding) =>
    sourceBelongsToRepeatBinding(
      { ...from, fieldId: collectionFieldIdFromItemFieldId(from.fieldId) },
      binding,
    ) && isPageBlockDescendantOf(blockParentMap.value, targetElementId, binding.targetElementId),
  )
  return Boolean(repeatBinding)
}

function withConnectionValues(
  nodeId: string,
  fields: PageBlueprintDisplayField[],
  connections: PageBlueprintConnection[],
): PageBlueprintDisplayField[] {
  return fields.map((field) => {
    const inputConnection = connections.find((item) => item.to.nodeId === nodeId && item.to.fieldId === field.id)
    const outputConnection = connections.some((item) => item.from.nodeId === nodeId && item.from.fieldId === field.id)
    return {
      ...field,
      value: inputConnection?.expression ?? field.value,
      inputConnected: Boolean(inputConnection),
      outputConnected: outputConnection,
    }
  })
}

function withUtilityConnectionValues(
  node: PageBlueprintUtilityNode,
  connections: PageBlueprintConnection[],
): PageBlueprintUtilityNode {
  const fields = node.type === 'run-workflow' ? ensureRunWorkflowEventField(node.fields, node.data?.eventType) : node.fields
  return {
    ...node,
    fields: fields.map((field) => {
      const inputConnection = connections.find((item) => item.to.nodeId === node.id && item.to.fieldId === field.id)
      const outputConnection = connections.some((item) => item.from.nodeId === node.id && item.from.fieldId === field.id)
      return {
        ...field,
        expression: inputConnection?.expression ?? field.expression,
        inputConnected: Boolean(inputConnection),
        outputConnected: outputConnection,
      }
    }),
  }
}

function withComponentConnectionValues(
  node: PageBlueprintComponentNode,
  connections: PageBlueprintConnection[],
): PageBlueprintComponentNode {
  return {
    ...node,
    fields: node.fields.map((field) => {
      const inputConnection = connections.find((item) => item.to.nodeId === node.id && item.to.fieldId === field.id)
      const outputConnection = connections.some((item) => item.from.nodeId === node.id && item.from.fieldId === field.id)
      return {
        ...field,
        expression: inputConnection?.expression ?? field.expression,
        inputConnected: Boolean(inputConnection),
        outputConnected: outputConnection,
      }
    }),
  }
}

function ensureRunWorkflowEventField(fields: PageBlueprintField[], eventType: unknown) {
  const existingEvent = fields.find((field) => field.id === 'event')
  const restFields = fields.filter((field) => field.id !== 'event')
  const normalizedEventType = typeof eventType === 'string' ? eventType : existingEvent?.value ?? 'click'
  return [
    existingEvent
      ? {
        ...existingEvent,
        label: createBlueprintEventLabel(normalizedEventType),
        type: 'event' as const,
        direction: 'output' as const,
        value: normalizedEventType ?? 'click',
      }
      : {
        id: 'event',
        label: createBlueprintEventLabel(normalizedEventType),
        type: 'event' as const,
        direction: 'output' as const,
        value: normalizedEventType ?? 'click',
        configurable: false,
      },
    ...restFields,
  ]
}

function blueprintElementFields(fields: PageBlueprintField[]): PageBlueprintDisplayField[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.type === 'event' ? createBlueprintEventLabel(field.value) : field.label,
    type: field.type,
    value: field.expression ?? field.value,
    input: field.direction === 'input' || field.direction === 'both',
    output: field.direction === 'output' || field.direction === 'both',
    inputConnected: field.inputConnected,
    outputConnected: field.outputConnected,
    mode: field.mode,
  }))
}

function mergeElementFields(
  persistedFields: PageBlueprintDisplayField[],
  dynamicFields: PageBlueprintDisplayField[],
): PageBlueprintDisplayField[] {
  const dynamicIds = new Set(dynamicFields.map((field) => field.id))
  const persistedById = new Map(persistedFields.map((field) => [field.id, field]))
  const customFields = persistedFields.filter((field) => !dynamicIds.has(field.id))
  return [
    ...customFields,
    ...dynamicFields.map((field) => ({
      ...field,
      mode: persistedById.get(field.id)?.mode ?? field.mode,
    })),
  ]
}

function isUtilityNode(node: unknown): node is PageBlueprintUtilityNode {
  return Boolean(node && typeof node === 'object' && (node as PageBlueprintUtilityNode).kind === 'utility')
}

function buildComponentGroups(components: PageBlueprintComponent[], items: PageBlueprintCanvasItem[]) {
  return buildGroupFrames(components.map((component) => ({
    id: component.id,
    name: component.name,
    nodeIds: component.nodeIds,
  })), items)
}

function buildSavedGroups(groups: PageBlueprintGroup[], items: PageBlueprintCanvasItem[]) {
  return buildGroupFrames(groups.map((group) => ({
    id: group.id,
    name: group.name,
    nodeIds: group.nodeIds,
  })), items)
}

function buildGroupFrames(groups: Array<{ id: string; name: string; nodeIds: string[] }>, items: PageBlueprintCanvasItem[]) {
  const itemsById = new Map(items.map((item) => [item.id, item]))
  return groups.flatMap((group) => {
    const childItems = group.nodeIds
      .map((nodeId) => itemsById.get(nodeId))
      .filter((item): item is PageBlueprintCanvasItem => Boolean(item))
    if (childItems.length < 2) return []

    const minX = Math.min(...childItems.map((item) => item.x)) - 26
    const minY = Math.min(...childItems.map((item) => item.y)) - 40
    const maxX = Math.max(...childItems.map((item) => item.x + (item.width ?? 240))) + 26
    const maxY = Math.max(...childItems.map((item) => item.y + (item.height ?? 90))) + 28

    return [{
      id: group.id,
      name: group.name,
      nodeIds: group.nodeIds,
      childCount: childItems.length,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }]
  })
}

function elementNodeId(elementId: string) {
  return `blueprint-element:${elementId}`
}

function elementNodeTitle(
  node: PageBlueprintNode | undefined,
  element: PageBlueprintViewModel['elements'][number],
) {
  const label = typeof node?.label === 'string' ? node.label.trim() : ''
  return element.label || (label && label !== element.id ? label : element.id)
}

function elementIdFromNodeId(nodeId: string) {
  return nodeId.startsWith('blueprint-element:') ? nodeId.slice('blueprint-element:'.length) : ''
}

function shortId(id: string) {
  const segment = id.split(':').at(-1) ?? id
  return segment.length > 18 ? `${segment.slice(0, 15)}...` : segment
}

function nodeHeight(fieldCount: number) {
  return 58 + Math.max(1, fieldCount) * 32 + 20
}

function utilityNodeHeight(fieldCount: number) {
  return 36 + fieldCount * 32 + (fieldCount > 0 ? 10 : 0)
}

function componentNodeHeight(fieldCount: number) {
  return 40 + Math.max(1, fieldCount) * 32 + 10
}
</script>
