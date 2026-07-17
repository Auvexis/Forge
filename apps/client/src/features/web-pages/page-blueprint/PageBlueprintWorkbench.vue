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
      @pointermove="updatePendingPointer"
      @pointerleave="clearPendingPointer"
    >
      <PageBlueprintConnectionLayer
        :nodes="connectionNodes"
        :connections="document.connections"
        :pending-output="pendingOutput"
        :pointer="pendingPointer"
        @remove-connection="blueprintStore.removeConnection"
      />

      <BaseElementGroup
        v-for="group in hierarchyGroups"
        :key="group.id"
        :block="group.block"
        :label="group.label"
        :tag="group.tag"
        :icon="group.icon"
        :preview="group.preview"
        :child-count="group.childCount"
        :color="group.color"
        :x="group.x"
        :y="group.y"
        :width="group.width"
        :height="group.height"
        :collapsed="collapsedGroupIds.has(group.id)"
        :selected="group.nodeIds.some((id) => selection.includes(id))"
        @toggle="toggleGroup(group.id)"
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
        >
          <BlueprintNodeFields
            :fields="itemData(item).fields"
            @pick-output="(fieldId, event) => startFieldConnection(item.id, fieldId, event)"
            @pick-input="(fieldId, event) => completeFieldConnection(item.id, fieldId, event)"
          />
        </BaseElement>
      </template>
    </BaseCanvas>
  </PageBlueprintShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
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
  createBindingFields,
  createElementFields,
  createWorkflowFields,
  type PageBlueprintDisplayField,
} from './pageBlueprintFields.ts'
import { buildPageBlueprintGroups, pageBlockIcon, type PageBlueprintGroupItem } from './pageBlueprintGroups.ts'
import { usePageBlueprintStore } from './pageBlueprint.store.ts'
import { getPageBlueprintNodeDefinition } from './pageBlueprintNodeRegistry.ts'
import type {
  PageBlueprintConnection,
  PageBlueprintConnectionEndpoint,
  PageBlueprintUtilityNode,
} from './pageBlueprintSchema.ts'
import { createPageBlueprintViewModel, type PageBlueprintViewModel } from './pageBlueprintViewModel.ts'
import BaseElementGroup from './components/BaseElementGroup.vue'
import BaseElement from './components/BaseElement.vue'
import BlueprintNodeFields from './components/BlueprintNodeFields.vue'
import NodeFloatingToolbar from './components/NodeFloatingToolbar.vue'
import PageBlueprintConnectionLayer, {
  type PageBlueprintConnectionNode,
} from './components/PageBlueprintConnectionLayer.vue'
import PageBlueprintShell from './components/PageBlueprintShell.vue'
import UtilityNodeRenderer from './components/UtilityNodeRenderer.vue'

type PageBlueprintCanvasItemKind = 'element' | 'workflow' | 'binding' | 'utility' | 'empty'

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
}>()

const selection = ref<string[]>([])
const blueprintStore = usePageBlueprintStore()
const { document } = storeToRefs(blueprintStore)
const pendingOutput = ref<PageBlueprintConnectionEndpoint | null>(null)
const pendingPointer = ref<{ x: number; y: number } | null>(null)
const activePointerId = ref<number | null>(null)
const viewport = computed<BaseCanvasViewport>({
  get: () => document.value.viewport,
  set: (nextViewport) => blueprintStore.setViewport(nextViewport),
})
const collapsedGroupIds = computed(() => new Set(document.value.collapsedGroups))
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

const elementGroupItems = computed<PageBlueprintGroupItem[]>(() =>
  canvasItems.value
    .filter((item) => itemData(item).kind === 'element' && itemData(item).elementId)
    .map((item) => ({
      id: item.id,
      elementId: itemData(item).elementId!,
      x: item.x,
      y: item.y,
      width: item.width ?? 244,
      height: item.height ?? nodeHeight(1),
    })),
)

const hierarchyGroups = computed(() => buildPageBlueprintGroups(props.blocks, elementGroupItems.value))
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

  blueprintStore.setNodePositions(nextPositions)
}

function toggleGroup(groupId: string) {
  const next = new Set(document.value.collapsedGroups)
  next.has(groupId) ? next.delete(groupId) : next.add(groupId)
  blueprintStore.setCollapsedGroups([...next])
}

function startGroupDrag(nodeIds: string[], event: PointerEvent) {
  if (event.button !== 0) return
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
}

function createCanvasItems(
  viewModel: PageBlueprintViewModel,
  utilityNodes: PageBlueprintUtilityNode[],
  connections: PageBlueprintConnection[],
): PageBlueprintCanvasItem[] {
  const elementItems = viewModel.elements.map((element, index) => ({
    id: elementNodeId(element.id),
    x: 40,
    y: 40 + index * 128,
    width: 244,
    height: nodeHeight(createElementFields(element).length),
    data: {
      kind: 'element' as const,
      title: element.label,
      eyebrow: element.events.length > 0 ? 'Element Event' : 'Page Element',
      detail: `${element.events.length} event(s) on ${element.tag}`,
      meta: shortId(element.id),
      icon: pageBlockIcon(element.tag),
      accent: 'var(--fabric-blue-400)',
      showFooter: true,
      fields: withConnectionValues(elementNodeId(element.id), createElementFields(element), connections),
      elementId: element.id,
    },
  }))

  const workflowItems = viewModel.workflows.map((workflow, index) => ({
    id: workflowNodeId(workflow.id),
    x: 360,
    y: 40 + index * 128,
    width: 260,
    height: nodeHeight(createWorkflowFields(workflow).length),
    data: {
      kind: 'workflow' as const,
      title: workflow.workflowName,
      eyebrow: 'Published Workflow',
      detail: `${workflow.triggerName} - ${workflow.returnCount} return field(s)`,
      meta: `${workflow.eventCount} event(s)`,
      icon: 'workflow',
      accent: 'var(--fabric-accent)',
      showFooter: true,
      fields: withConnectionValues(workflowNodeId(workflow.id), createWorkflowFields(workflow), connections),
    },
  }))

  const bindingItems = viewModel.bindings.map((binding, index) => ({
    id: bindingNodeId(binding.id),
    x: 704,
    y: 40 + index * 128,
    width: 272,
    height: nodeHeight(createBindingFields(binding).length),
    data: {
      kind: 'binding' as const,
      title: binding.target,
      eyebrow: binding.mode === 'multiple' ? 'Multiple Return Binding' : 'Single Return Binding',
      detail: binding.source,
      meta: binding.actionId,
      icon: binding.mode === 'multiple' ? 'copy-plus' : 'git-branch',
      accent: 'var(--fabric-green-400)',
      showFooter: true,
      fields: withConnectionValues(bindingNodeId(binding.id), createBindingFields(binding), connections),
    },
  }))

  const utilityItems = utilityNodes.map((node, index) => {
    const definition = getPageBlueprintNodeDefinition(node.type)
    return {
      id: node.id,
      x: 1040,
      y: 40 + index * 148,
      width: definition?.width ?? 280,
      height: definition?.height ?? nodeHeight(node.fields.length),
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
        utilityNode: withUtilityConnectionValues(node, connections),
      },
    }
  })

  const items = [...elementItems, ...workflowItems, ...bindingItems, ...utilityItems]
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
  return itemData(item).kind === 'utility' && document.value.nodes.some((node) => node.id === item.id)
}

function duplicateCanvasNode(nodeId: string) {
  const nextNodeId = blueprintStore.duplicateNode(nodeId)
  if (nextNodeId) selection.value = [nextNodeId]
}

function deleteCanvasNode(nodeId: string) {
  blueprintStore.removeNode?.(nodeId) ?? blueprintStore.deleteNode(nodeId)
  selection.value = selection.value.filter((id) => id !== nodeId)
  if (pendingOutput.value?.nodeId === nodeId) {
    pendingOutput.value = null
    pendingPointer.value = null
  }
}

function connectionFields(item: BaseCanvasItem) {
  const data = itemData(item)
  if (data.utilityNode) return data.utilityNode.fields.map((field) => ({ id: field.id }))
  return data.fields.map((field) => ({ id: field.id }))
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

function isUtilityNode(node: unknown): node is PageBlueprintUtilityNode {
  return Boolean(node && typeof node === 'object' && (node as PageBlueprintUtilityNode).kind === 'utility')
}

function elementNodeId(elementId: string) {
  return `blueprint-element:${elementId}`
}

function workflowNodeId(workflowId: string) {
  return `blueprint-workflow:${workflowId}`
}

function bindingNodeId(bindingId: string) {
  return `blueprint-binding:${bindingId}`
}

function shortId(id: string) {
  const segment = id.split(':').at(-1) ?? id
  return segment.length > 18 ? `${segment.slice(0, 15)}...` : segment
}

function nodeHeight(fieldCount: number) {
  return 58 + Math.max(1, fieldCount) * 32 + 20
}
</script>
