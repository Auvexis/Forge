<template>
  <PageBlueprintShell>
    <BaseCanvas
      v-model:selection="selection"
      v-model:viewport="viewport"
      class="web-page-blueprint-v2__canvas"
      :items="canvasItems"
      pattern-style="square"
      :pattern-size="24"
      :grid-size="24"
      @items-move="moveCanvasItems"
    >
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
        <BaseElement
          :title="itemData(item).title"
          :eyebrow="itemData(item).eyebrow"
          :icon="itemData(item).icon"
          :detail="itemData(item).detail"
          :meta="itemData(item).meta"
          :accent="itemData(item).accent"
          :selected="selected"
          :show-footer="itemData(item).showFooter"
        >
          <BaseField
            v-for="field in itemData(item).fields"
            :key="field.id"
            :label="field.label"
            :type="field.type"
            :value="field.value"
            :input="field.input"
            :output="field.output"
            :mode="field.mode"
          />
        </BaseElement>
      </template>
    </BaseCanvas>
  </PageBlueprintShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
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
  type PageBlueprintField,
} from './pageBlueprintFields.ts'
import { buildPageBlueprintGroups, pageBlockIcon, type PageBlueprintGroupItem } from './pageBlueprintGroups.ts'
import { createPageBlueprintViewModel, type PageBlueprintViewModel } from './pageBlueprintViewModel.ts'
import BaseElementGroup from './components/BaseElementGroup.vue'
import BaseElement from './components/BaseElement.vue'
import BaseField from './components/BaseField.vue'
import PageBlueprintShell from './components/PageBlueprintShell.vue'

type PageBlueprintCanvasItemKind = 'element' | 'workflow' | 'binding' | 'empty'

interface PageBlueprintCanvasItemData {
  kind: PageBlueprintCanvasItemKind
  title: string
  eyebrow: string
  detail: string
  meta: string
  icon: string
  accent: string
  showFooter: boolean
  fields: PageBlueprintField[]
  elementId?: string
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

const selection = ref<string[]>([])
const viewport = ref<BaseCanvasViewport>({ x: 0, y: 0, zoom: 1 })
const movedPositions = ref<Record<string, { x: number; y: number }>>({})
const collapsedGroupIds = ref(new Set<string>())
const groupDrag = ref<null | { nodeIds: string[]; pointerId: number; x: number; y: number }>(null)

const model = computed(() => createPageBlueprintViewModel({
  blocks: props.blocks,
  workflows: props.workflows,
  outputBindings: props.outputBindings,
  collectionBindings: props.collectionBindings,
}))

const canvasItems = computed<PageBlueprintCanvasItem[]>(() => {
  const items = createCanvasItems(model.value)
  return items.map((item) => ({
    ...item,
    ...(movedPositions.value[item.id] ?? {}),
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

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', moveGroupDrag)
  window.removeEventListener('pointercancel', stopGroupDrag)
})

function moveCanvasItems(event: BaseCanvasItemsMoveEvent) {
  const itemsById = new Map(canvasItems.value.map((item) => [item.id, item]))
  const nextPositions = { ...movedPositions.value }

  for (const itemId of event.itemIds) {
    const item = itemsById.get(itemId)
    if (!item) continue
    nextPositions[itemId] = {
      x: item.x + event.delta.x,
      y: item.y + event.delta.y,
    }
  }

  movedPositions.value = nextPositions
}

function toggleGroup(groupId: string) {
  const next = new Set(collapsedGroupIds.value)
  next.has(groupId) ? next.delete(groupId) : next.add(groupId)
  collapsedGroupIds.value = next
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

function createCanvasItems(viewModel: PageBlueprintViewModel): PageBlueprintCanvasItem[] {
  const elementItems = viewModel.elements.map((element, index) => ({
    id: `blueprint-element:${element.id}`,
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
      fields: createElementFields(element),
      elementId: element.id,
    },
  }))

  const workflowItems = viewModel.workflows.map((workflow, index) => ({
    id: `blueprint-workflow:${workflow.id}`,
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
      fields: createWorkflowFields(workflow),
    },
  }))

  const bindingItems = viewModel.bindings.map((binding, index) => ({
    id: `blueprint-binding:${binding.id}`,
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
      fields: createBindingFields(binding),
    },
  }))

  const items = [...elementItems, ...workflowItems, ...bindingItems]
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

function shortId(id: string) {
  const segment = id.split(':').at(-1) ?? id
  return segment.length > 18 ? `${segment.slice(0, 15)}...` : segment
}

function nodeHeight(fieldCount: number) {
  return 58 + Math.max(1, fieldCount) * 32 + 20
}
</script>
