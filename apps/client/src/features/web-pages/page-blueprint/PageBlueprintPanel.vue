<template>
  <section class="web-page-blueprint">
    <aside class="web-page-blueprint__palette" :style="{ width: `${paletteWidth}px` }">
      <span
        class="web-page-blueprint__resize web-page-blueprint__resize--left"
        role="separator"
        title="Resize Palette"
        @mousedown="startPaletteResize"
      />
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
        @click="addPaletteNode(item)"
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
        @items-move="moveBlueprintNodes"
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

    <aside class="web-page-blueprint__details" :style="{ width: `${detailsWidth}px` }">
      <span
        class="web-page-blueprint__resize web-page-blueprint__resize--right"
        role="separator"
        title="Resize Details"
        @mousedown="startDetailsResize"
      />
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
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseCanvas from '@/shared/base-canvas/BaseCanvas.vue'
import type { BaseCanvasItem, BaseCanvasItemsMoveEvent, BaseCanvasViewport } from '@/shared/base-canvas/types.ts'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { usePagesStore } from '../stores/pages.store.ts'
import PageDataActionsPanel from '../data-actions/components/PageDataActionsPanel.vue'
import { usePageActionsStore } from '../data-actions/stores/page-actions.store.ts'
import { blueprintScopeId, createPageBlueprintDocument } from './pageBlueprintDocument.ts'
import {
  PAGE_BLUEPRINT_DOCUMENT_VERSION,
  type PageBlueprintDocument,
  type PageBlueprintNode,
  type PageBlueprintNodeKind,
  type PageBlueprintScope,
} from './pageBlueprint.types.ts'

const props = defineProps<{
  scope?: PageBlueprintScope | null
}>()

const pagesStore = usePagesStore()
const actionsStore = usePageActionsStore()
const selection = ref<string[]>([])
const viewport = ref<BaseCanvasViewport>({ x: 72, y: 64, zoom: 1 })
const paletteWidth = ref(240)
const detailsWidth = ref(340)
const resizeState = ref<null | { side: 'palette' | 'details'; startX: number; startWidth: number }>(null)

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
const paletteItems = computed<Array<{ id: string; label: string; detail: string; icon: string; kind: PageBlueprintNodeKind }>>(() => [
  { id: 'events', label: 'Event', detail: 'Click, submit, mount', icon: 'radio', kind: 'event' },
  { id: 'workflows', label: 'Workflow Action', detail: `${actionsStore.workflows.length} workflows`, icon: 'workflow', kind: 'workflow-action' },
  { id: 'elements', label: 'Element', detail: 'Inputs, text, buttons', icon: 'box-select', kind: 'element' },
  { id: 'data', label: 'Result Binding', detail: 'Outputs and collections', icon: 'database', kind: 'result-binding' },
  { id: 'logic', label: 'JavaScript', detail: 'Conditions and transforms', icon: 'split', kind: 'javascript' },
])
const viewBox = '-120 -80 1280 560'

onBeforeUnmount(() => {
  stopResize()
})

watch(document, (next) => {
  viewport.value = { ...next.viewport }
  selection.value = [...next.selectedNodeIds]
}, { immediate: true })

function nodeForItem(itemId: string): PageBlueprintNode | null {
  return graph.value.nodes.find((node) => node.id === itemId) ?? null
}

function moveBlueprintNodes(event: BaseCanvasItemsMoveEvent) {
  const moved = new Set(event.itemIds)
  persistBlueprintDocument({
    ...document.value,
    graph: {
      ...graph.value,
      nodes: graph.value.nodes.map((node) =>
        moved.has(node.id)
          ? { ...node, x: node.x + event.delta.x, y: node.y + event.delta.y }
          : node,
      ),
    },
    selectedNodeIds: selection.value,
    viewport: viewport.value,
    updatedAt: new Date().toISOString(),
  })
}

function addPaletteNode(item: { label: string; detail: string; icon: string; kind: PageBlueprintNodeKind }) {
  const node: PageBlueprintNode = {
    id: `node:${item.kind}:${Date.now().toString(36)}`,
    kind: item.kind,
    label: item.label,
    detail: item.detail,
    icon: item.icon,
    x: Math.round((-viewport.value.x + 120) / viewport.value.zoom),
    y: Math.round((-viewport.value.y + 120 + graph.value.nodes.length * 18) / viewport.value.zoom),
    width: 184,
    height: 54,
  }
  persistBlueprintDocument({
    ...document.value,
    graph: {
      nodes: [...graph.value.nodes, node],
      edges: [...graph.value.edges],
    },
    selectedNodeIds: [node.id],
    viewport: viewport.value,
    updatedAt: new Date().toISOString(),
  })
  selection.value = [node.id]
}

function persistBlueprintDocument(nextDocument: PageBlueprintDocument) {
  const page = pagesStore.activePage
  if (!page) return
  const scope = nextDocument.scope
  const id = blueprintScopeId(scope)
  pagesStore.setActivePage({
    ...page,
    pageActions: {
      inputBindings: page.pageActions?.inputBindings ?? {},
      outputBindings: page.pageActions?.outputBindings,
      collectionBindings: page.pageActions?.collectionBindings,
      blueprints: {
        ...(page.pageActions?.blueprints ?? {}),
        [id]: {
          ...nextDocument,
          version: PAGE_BLUEPRINT_DOCUMENT_VERSION,
        },
      },
    },
  })
}

function startPaletteResize(event: MouseEvent) {
  resizeState.value = { side: 'palette', startX: event.clientX, startWidth: paletteWidth.value }
  startResize()
}

function startDetailsResize(event: MouseEvent) {
  resizeState.value = { side: 'details', startX: event.clientX, startWidth: detailsWidth.value }
  startResize()
}

function startResize() {
  window.addEventListener('mousemove', resizePanel)
  window.addEventListener('mouseup', stopResize, { once: true })
}

function resizePanel(event: MouseEvent) {
  const state = resizeState.value
  if (!state) return
  if (state.side === 'palette') {
    paletteWidth.value = Math.min(420, Math.max(180, state.startWidth + event.clientX - state.startX))
    return
  }
  detailsWidth.value = Math.min(520, Math.max(240, state.startWidth + state.startX - event.clientX))
}

function stopResize() {
  resizeState.value = null
  window.removeEventListener('mousemove', resizePanel)
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
