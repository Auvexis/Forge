<template>
  <nav class="web-page-tree" role="tree">
    <section v-if="groups.length" class="web-page-tree__section">
      <span>Groups</span>
      <LucideIcon name="list-filter" :size="14" />
    </section>
    <BlueprintComponentsTreeItem
      v-for="group in groupItems"
      :key="group.id"
      :item="group"
      :expanded="expanded"
      :selected-node-id="selectedNodeId"
      @toggle="toggleItem"
      @select-node="$emit('selectNode', $event)"
      @select-component="$emit('selectComponent', $event)"
    />

    <section v-if="components.length" class="web-page-tree__section">
      <span>Components</span>
      <LucideIcon name="list-filter" :size="14" />
    </section>
    <BlueprintComponentsTreeItem
      v-for="component in componentItems"
      :key="component.id"
      :item="component"
      :expanded="expanded"
      :selected-node-id="selectedNodeId"
      @toggle="toggleItem"
      @select-node="$emit('selectNode', $event)"
      @select-component="$emit('selectComponent', $event)"
    />

    <p v-if="components.length === 0 && groups.length === 0" class="web-page-blueprint-toolbox__empty">
      No page components or groups.
    </p>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlock } from '../../types/page.types.ts'
import { blockDisplayName } from '../../utils/blockTree.ts'
import type {
  PageBlueprintComponent,
  PageBlueprintComponentNode,
  PageBlueprintGroup,
  PageBlueprintNode,
} from '../pageBlueprintSchema.ts'
import BlueprintComponentsTreeItem from './BlueprintComponentsTreeItem.vue'
import type { BlueprintComponentsTreeItemModel } from './blueprintComponentsTree.types.ts'

const props = defineProps<{
  components: PageBlueprintComponent[]
  groups: PageBlueprintGroup[]
  nodes: PageBlueprintNode[]
  blocks: PageBlock[]
  selectedNodeId?: string | null
}>()

defineEmits<{
  selectComponent: [componentId: string]
  selectNode: [nodeId: string]
}>()

const expanded = ref<Record<string, boolean>>({})
const nodesById = computed(() => new Map(props.nodes.map((node) => [node.id, node])))
const elementNodesByElementId = computed(() => {
  const entries = props.nodes.flatMap((node) => {
    const elementId = elementIdFromNode(node)
    return elementId ? [[elementId, node] as const] : []
  })
  return new Map(entries)
})

const groupItems = computed<BlueprintComponentsTreeItemModel[]>(() =>
  props.groups.map((group) => ({
    id: group.id,
    name: group.name,
    treeId: group.id,
    icon: 'group',
    accent: group.color ?? '#8b6fd6',
    kind: 'group',
    children: nodesToTreeItems(group.nodeIds, new Set([group.id])),
  })),
)

const componentItems = computed<BlueprintComponentsTreeItemModel[]>(() =>
  props.components.map((component) => ({
    id: component.id,
    name: component.name,
    treeId: component.id,
    icon: 'component',
    kind: 'component',
    componentId: component.id,
    nodeId: componentNodeId(component.id),
    children: nodesToTreeItems(component.nodeIds, new Set([component.id])),
  })),
)

function toggleItem(itemId: string) {
  expanded.value = {
    ...expanded.value,
    [itemId]: expanded.value[itemId] === false,
  }
}

function nodesToTreeItems(nodeIds: string[], visitedComponentIds: Set<string>) {
  const uniqueNodeIds = [...new Set(nodeIds)]
  const allowedNodeIds = new Set(uniqueNodeIds)
  const blockItems = blockTreeItems(props.blocks, allowedNodeIds, visitedComponentIds)
  const blockNodeIds = new Set(flattenItems(blockItems).map((item) => item.nodeId).filter(Boolean))
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
): BlueprintComponentsTreeItemModel[] {
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
      kind: 'node' as const,
      nodeId: node.id,
      children,
    }]
  })
}

function nodeToTreeItem(
  node: PageBlueprintNode,
  visitedComponentIds: Set<string>,
): BlueprintComponentsTreeItemModel {
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
    kind: node.kind === 'component' && component ? 'component' : 'node',
    nodeId: node.id,
    componentId: component?.id,
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

function flattenItems(items: BlueprintComponentsTreeItemModel[]): BlueprintComponentsTreeItemModel[] {
  return items.flatMap((item) => [item, ...flattenItems(item.children)])
}

</script>
