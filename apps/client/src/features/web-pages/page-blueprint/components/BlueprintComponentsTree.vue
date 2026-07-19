<template>
  <nav class="web-page-tree web-page-blueprint-components-tree" role="tree">
    <section v-if="groups.length" class="web-page-tree__section">
      <span>Groups</span>
      <small>{{ groups.length }}</small>
    </section>
    <BlueprintComponentsTreeItem
      v-for="group in groupItems"
      :key="group.id"
      :item="group"
      :expanded="expanded"
      @toggle="toggleItem"
      @select-node="$emit('selectNode', $event)"
      @select-component="$emit('selectComponent', $event)"
    />

    <section v-if="components.length" class="web-page-tree__section">
      <span>Components</span>
      <small>{{ components.length }}</small>
    </section>
    <BlueprintComponentsTreeItem
      v-for="component in componentItems"
      :key="component.id"
      :item="component"
      :expanded="expanded"
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
}>()

defineEmits<{
  selectComponent: [componentId: string]
  selectNode: [nodeId: string]
}>()

const expanded = ref<Record<string, boolean>>({})
const nodesById = computed(() => new Map(props.nodes.map((node) => [node.id, node])))

const groupItems = computed<BlueprintComponentsTreeItemModel[]>(() =>
  props.groups.map((group) => ({
    id: group.id,
    label: group.name,
    detail: `${group.nodeIds.length} nodes`,
    icon: 'group',
    accent: group.color ?? '#8b6fd6',
    kind: 'group',
    children: nodesToTreeItems(group.nodeIds),
  })),
)

const componentItems = computed<BlueprintComponentsTreeItemModel[]>(() =>
  props.components.map((component) => ({
    id: component.id,
    label: component.name,
    detail: `${component.nodeIds.length} nodes / ${component.props.length} props`,
    icon: 'component',
    kind: 'component',
    componentId: component.id,
    children: nodesToTreeItems(component.nodeIds),
  })),
)

function toggleItem(itemId: string) {
  expanded.value = {
    ...expanded.value,
    [itemId]: expanded.value[itemId] === false,
  }
}

function nodesToTreeItems(nodeIds: string[]) {
  return [...new Set(nodeIds)]
    .map((nodeId) => nodesById.value.get(nodeId))
    .filter((node): node is PageBlueprintNode => Boolean(node))
    .map(nodeToTreeItem)
}

function nodeToTreeItem(node: PageBlueprintNode): BlueprintComponentsTreeItemModel {
  const componentNode = node.kind === 'component' ? node as PageBlueprintComponentNode : null
  const component = componentNode
    ? props.components.find((item) => item.id === componentNode.componentId)
    : null
  return {
    id: node.id,
    label: node.label,
    detail: node.id,
    icon: iconForNode(node),
    accent: node.accent,
    kind: node.kind === 'component' && component ? 'component' : 'node',
    nodeId: node.id,
    componentId: component?.id,
    children: component ? nodesToTreeItems(component.nodeIds) : [],
  }
}

function iconForNode(node: PageBlueprintNode) {
  if (node.icon) return node.icon
  if (node.kind === 'utility') return 'blocks'
  if (node.kind === 'component') return 'component'
  if (node.type === 'page-element') return 'box'
  return 'hash'
}

</script>
