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
      :rulers="true"
      @items-move="moveCanvasItems"
    >
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
        />
      </template>
    </BaseCanvas>
  </PageBlueprintShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  PageActionCollectionBinding,
  PageActionOutputBinding,
  PageActionWorkflowSummary,
} from '@/core/page-actions'
import { BaseCanvas } from '@/shared/base-canvas/components.ts'
import type { BaseCanvasItem, BaseCanvasItemsMoveEvent, BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import type { PageBlock } from '../types/page.types.ts'
import { createPageBlueprintViewModel, type PageBlueprintViewModel } from './pageBlueprintViewModel.ts'
import BaseElement from './components/BaseElement.vue'
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
const viewport = ref<BaseCanvasViewport>({ x: 48, y: 48, zoom: 1 })
const movedPositions = ref<Record<string, { x: number; y: number }>>({})

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

function createCanvasItems(viewModel: PageBlueprintViewModel): PageBlueprintCanvasItem[] {
  const elementItems = viewModel.elements.map((element, index) => ({
    id: `blueprint-element:${element.id}`,
    x: 40,
    y: 40 + index * 128,
    width: 244,
    height: 96,
    data: {
      kind: 'element' as const,
      title: element.label,
      eyebrow: 'Element Event',
      detail: `${element.events.length} event(s) on ${element.tag}`,
      meta: shortId(element.id),
      icon: 'box',
      accent: 'var(--fabric-blue-400)',
      showFooter: true,
    },
  }))

  const workflowItems = viewModel.workflows.map((workflow, index) => ({
    id: `blueprint-workflow:${workflow.id}`,
    x: 360,
    y: 40 + index * 128,
    width: 260,
    height: 96,
    data: {
      kind: 'workflow' as const,
      title: workflow.workflowName,
      eyebrow: 'Published Workflow',
      detail: `${workflow.triggerName} - ${workflow.returnCount} return field(s)`,
      meta: `${workflow.eventCount} event(s)`,
      icon: 'workflow',
      accent: 'var(--fabric-accent)',
      showFooter: true,
    },
  }))

  const bindingItems = viewModel.bindings.map((binding, index) => ({
    id: `blueprint-binding:${binding.id}`,
    x: 704,
    y: 40 + index * 128,
    width: 272,
    height: 108,
    data: {
      kind: 'binding' as const,
      title: binding.target,
      eyebrow: binding.mode === 'multiple' ? 'Multiple Return Binding' : 'Single Return Binding',
      detail: binding.source,
      meta: binding.actionId,
      icon: binding.mode === 'multiple' ? 'copy-plus' : 'git-branch',
      accent: 'var(--fabric-green-400)',
      showFooter: true,
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
</script>
