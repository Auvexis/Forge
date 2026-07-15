<template>
  <section class="web-page-blueprint">
    <aside class="web-page-blueprint__palette">
      <header class="web-page-blueprint__panel-header">
        <strong>Palette</strong>
        <BaseButton
          variant="ghost"
          size="icon"
          icon-left="refresh-cw"
          title="Refresh actions"
          :loading="actionsStore.isLoading"
          @click="actionsStore.loadAvailableActions()"
        />
      </header>
      <button
        v-for="item in paletteItems"
        :key="item.id"
        class="web-page-blueprint__palette-item"
        type="button"
      >
        <LucideIcon :name="item.icon" :size="14" />
        <span>
          {{ item.label }}
          <small>{{ item.detail }}</small>
        </span>
      </button>
    </aside>

    <div class="web-page-blueprint__graph">
      <header class="web-page-blueprint__header">
        <div>
          <strong>{{ documentTitle }}</strong>
          <span>{{ graphSummary }}</span>
        </div>
        <span class="web-page-blueprint__header-meta">
          <LucideIcon name="mouse-pointer-2" :size="13" />
          {{ selectedLabel }}
        </span>
      </header>

      <div v-if="graph.nodes.length === 0" class="web-page-blueprint__empty">
        <LucideIcon name="workflow" :size="20" />
        <strong>Select an action</strong>
        <span>Choose a workflow trigger in the Logic panel to build a page dataflow.</span>
      </div>
      <BaseCanvas
        v-else
        v-model:selection="selection"
        v-model:viewport="viewport"
        class="web-page-blueprint__surface"
        :items="canvasItems"
        :snap-to-grid="true"
        :grid-size="24"
        pattern-style="square"
        background-color="var(--fabric-blueprint-canvas-bg, var(--fabric-bg-canvas))"
        pattern-color="var(--fabric-blueprint-canvas-grid, var(--fabric-border-subtle))"
        :pattern-size="24"
        @canvas-click="selection = []"
      >
        <svg class="web-page-blueprint__edges" :viewBox="viewBox" aria-hidden="true">
          <path
            v-for="edge in graph.edges"
            :key="edge.id"
            class="web-page-blueprint__edge"
            :d="edgePath(edge.from, edge.to)"
          />
        </svg>
        <template #item="{ item, selected }">
          <article
            class="web-page-blueprint__node"
            :class="[
              `web-page-blueprint__node--${nodeForItem(item.id)?.kind}`,
              { 'web-page-blueprint__node--selected': selected },
            ]"
          >
            <LucideIcon :name="nodeForItem(item.id)?.icon ?? 'box'" :size="15" />
            <span>
              {{ nodeForItem(item.id)?.label }}
              <small>{{ nodeForItem(item.id)?.detail }}</small>
            </span>
          </article>
        </template>
      </BaseCanvas>
    </div>

    <aside class="web-page-blueprint__details">
      <header class="web-page-blueprint__panel-header">
        <strong>Details</strong>
        <span>{{ activeNode?.kind ?? 'Canvas' }}</span>
      </header>
      <dl v-if="activeNode" class="web-page-blueprint__details-list">
        <div>
          <dt>Name</dt>
          <dd>{{ activeNode.label }}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{{ activeNode.kind }}</dd>
        </div>
        <div>
          <dt>Position</dt>
          <dd>{{ Math.round(activeNode.x) }}, {{ Math.round(activeNode.y) }}</dd>
        </div>
      </dl>
      <p v-else class="web-page-blueprint__details-empty">Select a node to inspect bindings, pins, and runtime data.</p>
      <PageDataActionsPanel />
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseCanvas from '@/shared/base-canvas/BaseCanvas.vue'
import type { BaseCanvasItem, BaseCanvasViewport } from '@/shared/base-canvas/types.ts'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { usePagesStore } from '../stores/pages.store.ts'
import PageDataActionsPanel from '../data-actions/components/PageDataActionsPanel.vue'
import { usePageActionsStore } from '../data-actions/stores/page-actions.store.ts'
import { createPageBlueprintDocument } from './pageBlueprintDocument.ts'
import type { PageBlueprintNode, PageBlueprintScope } from './pageBlueprint.types.ts'

const props = defineProps<{
  scope?: PageBlueprintScope | null
}>()

const pagesStore = usePagesStore()
const actionsStore = usePageActionsStore()
const selection = ref<string[]>([])
const viewport = ref<BaseCanvasViewport>({ x: 72, y: 64, zoom: 1 })

const document = computed(() =>
  createPageBlueprintDocument({
    pageId: pagesStore.activePage?.id ?? 'draft-page',
    selectedAction: actionsStore.selectedAction,
    pageActions: pagesStore.activePage?.pageActions ?? null,
    scope: props.scope ?? undefined,
  }),
)
const graph = computed(() => document.value.graph)
const canvasItems = computed<BaseCanvasItem[]>(() =>
  graph.value.nodes.map((node) => ({
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width ?? 184,
    height: node.height ?? 54,
  })),
)
const graphSummary = computed(() =>
  graph.value.nodes.length === 0 ? 'No active graph' : `${graph.value.nodes.length} nodes / ${graph.value.edges.length} links`,
)
const documentTitle = computed(() => document.value.scope.type === 'element' ? document.value.scope.label : 'Page Blueprint')
const selectedLabel = computed(() => activeNode.value?.label ?? 'Canvas')
const activeNode = computed(() => selection.value[0] ? nodeForItem(selection.value[0]) : null)
const paletteItems = computed(() => [
  { id: 'events', label: 'Events', detail: 'Click, submit, mount', icon: 'radio' },
  { id: 'workflows', label: 'Workflow Actions', detail: `${actionsStore.workflows.length} workflows`, icon: 'workflow' },
  { id: 'elements', label: 'Elements', detail: 'Inputs, text, buttons', icon: 'box-select' },
  { id: 'data', label: 'Data', detail: 'Outputs and collections', icon: 'database' },
  { id: 'logic', label: 'Logic', detail: 'Conditions and transforms', icon: 'split' },
])
const viewBox = '-120 -80 1280 560'

watch(document, (next) => {
  viewport.value = { ...next.viewport }
  selection.value = [...next.selectedNodeIds]
}, { immediate: true })

function nodeForItem(itemId: string): PageBlueprintNode | null {
  return graph.value.nodes.find((node) => node.id === itemId) ?? null
}

function edgePath(fromId: string, toId: string) {
  const from = graph.value.nodes.find((node) => node.id === fromId)
  const to = graph.value.nodes.find((node) => node.id === toId)
  if (!from || !to) return ''
  const startX = from.x + (from.width ?? 184)
  const startY = from.y + ((from.height ?? 54) / 2)
  const endX = to.x
  const endY = to.y + ((to.height ?? 54) / 2)
  const control = Math.max(48, (endX - startX) / 2)
  return `M ${startX} ${startY} C ${startX + control} ${startY}, ${endX - control} ${endY}, ${endX} ${endY}`
}
</script>
