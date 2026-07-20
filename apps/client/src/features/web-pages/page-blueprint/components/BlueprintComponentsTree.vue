<template>
  <div>
    <BaseWebPageTree
      :sections="sections"
      :selected-item-ids="selectedNodeId ? [selectedNodeId] : []"
      @select="selectTreeItem"
      @action="selectTreeItem($event.item)"
      @rename="renameTreeItem"
    />
    <p v-if="components.length === 0 && groups.length === 0" class="web-page-blueprint-toolbox__empty">
      No page components or groups.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseWebPageTree, {
  type BaseWebPageTreeItem,
  type BaseWebPageTreeSection,
} from '../../components/BaseWebPageTree.vue'
import type { PageBlock } from '../../types/page.types.ts'
import { blockDisplayName } from '../../utils/blockTree.ts'
import type {
  PageBlueprintComponent,
  PageBlueprintComponentNode,
  PageBlueprintGroup,
  PageBlueprintNode,
} from '../pageBlueprintSchema.ts'

const props = defineProps<{
  components: PageBlueprintComponent[]
  groups: PageBlueprintGroup[]
  nodes: PageBlueprintNode[]
  blocks: PageBlock[]
  selectedNodeId?: string | null
}>()

const emit = defineEmits<{
  selectComponent: [componentId: string]
  selectNode: [nodeId: string]
  renameGroup: [groupId: string, name: string]
  renameGroupId: [groupId: string, nextGroupId: string]
  renameComponent: [componentId: string, name: string]
  renameNodeLabel: [nodeId: string, label: string]
  renameNodeId: [nodeId: string, nextNodeId: string]
}>()

const nodesById = computed(() => new Map(props.nodes.map((node) => [node.id, node])))
const elementNodesByElementId = computed(() => {
  const entries = props.nodes.flatMap((node) => {
    const elementId = elementIdFromNode(node)
    return elementId ? [[elementId, node] as const] : []
  })
  return new Map(entries)
})

const sections = computed<BaseWebPageTreeSection[]>(() => [
  {
    id: 'groups',
    label: 'Groups',
    icon: 'list-filter',
    items: props.groups.map((group) => ({
      id: group.id,
      name: group.name,
      treeId: group.id,
      icon: 'group',
      accent: group.color ?? '#8b6fd6',
      actions: selectActions(),
      data: { kind: 'group', groupId: group.id },
      children: nodesToTreeItems(group.nodeIds, new Set([group.id])),
    })),
  },
  {
    id: 'components',
    label: 'Components',
    icon: 'list-filter',
    items: props.components.map((component) => ({
      id: componentNodeId(component.id),
      name: component.name,
      treeId: component.id,
      icon: 'component',
      editableTreeId: false,
      actions: selectActions(),
      data: { kind: 'component', componentId: component.id, nodeId: componentNodeId(component.id) },
      children: nodesToTreeItems(component.nodeIds, new Set([component.id])),
    })),
  },
])

function nodesToTreeItems(nodeIds: string[], visitedComponentIds: Set<string>) {
  const uniqueNodeIds = [...new Set(nodeIds)]
  const allowedNodeIds = new Set(uniqueNodeIds)
  const blockItems = blockTreeItems(props.blocks, allowedNodeIds, visitedComponentIds)
  const blockNodeIds = new Set(flattenItems(blockItems).map((item) => item.data?.nodeId).filter(Boolean))
  const looseItems = uniqueNodeIds
    .filter((nodeId) => !blockNodeIds.has(nodeId))
    .map((nodeId) => nodesById.value.get(nodeId))
    .filter((node): node is PageBlueprintNode => Boolean(node))
    .map((node) => nodeToTreeItem(node, visitedComponentIds))

  return [...blockItems, ...looseItems]
}

function blockTreeItems(
  blocks: PageBlock[],
  allowedNodeIds: Set<string>,
  visitedComponentIds: Set<string>,
): BaseWebPageTreeItem[] {
  return blocks.flatMap((block) => {
    const children = blockTreeItems(block.children ?? [], allowedNodeIds, visitedComponentIds)
    const node = elementNodesByElementId.value.get(block.id)
    if (!node || !allowedNodeIds.has(node.id)) return children

    return [{
      id: node.id,
      name: blockDisplayName(block),
      treeId: block.id,
      icon: iconForBlock(block),
      accent: node.accent,
      actions: selectActions(),
      editableName: true,
      editableTreeId: true,
      data: { kind: 'node', nodeId: node.id },
      children,
    }]
  })
}

function nodeToTreeItem(
  node: PageBlueprintNode,
  visitedComponentIds: Set<string>,
): BaseWebPageTreeItem {
  const componentNode = node.kind === 'component' ? node as PageBlueprintComponentNode : null
  const component = componentNode
    ? props.components.find((item) => item.id === componentNode.componentId)
    : null
  const nextVisitedComponentIds = component ? new Set([...visitedComponentIds, component.id]) : visitedComponentIds
  const canRenderComponentChildren = Boolean(component && !visitedComponentIds.has(component.id))
  return {
    id: node.id,
    name: node.label,
    treeId: node.id,
    icon: iconForNode(node),
    accent: node.accent,
    actions: selectActions(),
    editableName: true,
    editableTreeId: true,
    data: {
      kind: node.kind === 'component' && component ? 'component' : 'node',
      nodeId: node.id,
      componentId: component?.id,
    },
    children: component && canRenderComponentChildren
      ? nodesToTreeItems(component.nodeIds, nextVisitedComponentIds)
      : [],
  }
}

function iconForNode(node: PageBlueprintNode) {
  if (node.icon) return node.icon
  if (node.kind === 'utility') return 'blocks'
  if (node.kind === 'component') return 'component'
  if (node.type === 'page-element') return 'box'
  return 'hash'
}

function iconForBlock(block: PageBlock) {
  if (block.tag === 'image') return 'image'
  if (block.tag === 'audio') return 'music'
  if (block.tag === 'video') return 'clapperboard'
  if (block.tag === 'youtube') return 'youtube'
  if (block.tag === 'form') return 'clipboard-list'
  if (block.tag === 'button') return 'square-mouse-pointer'
  if (block.tag === 'input') return 'text-cursor-input'
  if (block.tag === 'link') return 'link'
  if (block.tag === 'text') return 'type'
  return 'hash'
}

function elementIdFromNode(node: PageBlueprintNode) {
  return node.kind === 'element' && 'elementId' in node && typeof node.elementId === 'string'
    ? node.elementId
    : ''
}

function componentNodeId(componentId: string) {
  return `blueprint-component:${componentId}`
}

function flattenItems(items: BaseWebPageTreeItem[]): BaseWebPageTreeItem[] {
  return items.flatMap((item) => [item, ...flattenItems(item.children ?? [])])
}

function selectActions() {
  return [{ id: 'select', label: 'Select', icon: 'mouse-pointer-2' }]
}

function selectTreeItem(item: BaseWebPageTreeItem) {
  const componentId = item.data?.componentId
  if (typeof componentId === 'string') {
    emit('selectComponent', componentId)
    return
  }
  const nodeId = item.data?.nodeId
  if (typeof nodeId === 'string') emit('selectNode', nodeId)
}

function renameTreeItem(payload: { item: BaseWebPageTreeItem; field: 'name' | 'treeId'; value: string }) {
  const { item, field, value } = payload
  const kind = item.data?.kind
  if (kind === 'group') {
    const groupId = item.data?.groupId
    if (typeof groupId !== 'string') return
    if (field === 'name') emit('renameGroup', groupId, value)
    else emit('renameGroupId', groupId, value)
    return
  }

  const componentId = item.data?.componentId
  if (kind === 'component' && typeof componentId === 'string') {
    if (field === 'name') emit('renameComponent', componentId, value)
    return
  }

  const nodeId = item.data?.nodeId
  if (typeof nodeId !== 'string') return
  if (field === 'name') emit('renameNodeLabel', nodeId, value)
  else emit('renameNodeId', nodeId, value)
}

</script>
