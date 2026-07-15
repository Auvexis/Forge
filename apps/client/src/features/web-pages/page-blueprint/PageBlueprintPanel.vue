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
        @canvas-click="clearCanvasSelection"
        @items-move="moveBlueprintNodes"
      >
        <svg class="web-page-blueprint__edges" :viewBox="viewBox" aria-hidden="true">
          <path
            v-for="edge in graph.edges"
            :key="edge.id"
            class="web-page-blueprint__edge"
            :class="{ 'web-page-blueprint__edge--selected': selectedEdgeId === edge.id }"
            :d="edgePath(edge.from, edge.to)"
            @click.stop="selectedEdgeId = edge.id"
          />
        </svg>
        <div
          v-if="selectedEdge"
          class="web-page-blueprint__edge-toolbar"
          :style="{ transform: `translate(${edgeToolbarPosition.x}px, ${edgeToolbarPosition.y}px)` }"
          @pointerdown.stop
        >
          <button type="button" title="Delete connection" @click="deleteSelectedEdge">
            <LucideIcon name="unlink" :size="13" />
          </button>
        </div>
        <template #item="{ item, selected }">
          <article
            class="web-page-blueprint__node"
            :class="[
              `web-page-blueprint__node--${nodeForItem(item.id)?.kind}`,
              { 'web-page-blueprint__node--selected': selected },
            ]"
          >
            <button
              class="web-page-blueprint__node-handle web-page-blueprint__node-handle--input"
              type="button"
              title="Input"
              @pointerup.stop.prevent="finishConnection(item.id)"
            />
            <button
              class="web-page-blueprint__node-handle web-page-blueprint__node-handle--output"
              type="button"
              title="Output"
              @pointerdown.stop.prevent="startConnection(item.id)"
            />
            <div v-if="selected" class="web-page-blueprint__node-toolbar" @pointerdown.stop>
              <button type="button" title="Duplicate node" @click="duplicateNode(item.id)">
                <LucideIcon name="copy" :size="12" />
              </button>
              <button type="button" title="Delete node" @click="deleteNode(item.id)">
                <LucideIcon name="trash-2" :size="12" />
              </button>
            </div>
            <header class="web-page-blueprint__node-header">
              <LucideIcon :name="nodeForItem(item.id)?.icon ?? 'box'" :size="15" />
              <span>{{ nodeForItem(item.id)?.label }}</span>
            </header>
            <dl class="web-page-blueprint__node-meta">
              <div>
                <dt>Type</dt>
                <dd>{{ nodeForItem(item.id)?.kind }}</dd>
              </div>
              <div>
                <dt>ID</dt>
                <dd>{{ item.id }}</dd>
              </div>
              <div v-if="nodeForItem(item.id)?.detail">
                <dt>Detail</dt>
                <dd>{{ nodeForItem(item.id)?.detail }}</dd>
              </div>
            </dl>
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
        <span>{{ detailsStepLabel }}</span>
      </header>
      <div class="web-page-blueprint__details-tabs">
        <button
          type="button"
          :class="{ 'web-page-blueprint__details-tab--active': detailsStep === 'choose' }"
          @click="detailsStep = 'choose'"
        >
          Data / Action
        </button>
        <button
          type="button"
          :class="{ 'web-page-blueprint__details-tab--active': detailsStep === 'configure' }"
          @click="detailsStep = 'configure'"
        >
          Configure
        </button>
      </div>
      <div v-if="detailsStep === 'choose'" class="web-page-blueprint__details-choose">
        <button
          v-for="item in paletteItems"
          :key="`details:${item.id}`"
          type="button"
          @click="addPaletteNode(item); detailsStep = 'configure'"
        >
          <LucideIcon :name="item.icon" :size="14" />
          <span>
            {{ item.label }}
            <small>{{ item.detail }}</small>
          </span>
        </button>
      </div>
      <PageDataActionsPanel v-else />
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
const selectedEdgeId = ref<string | null>(null)
const connectionStartNodeId = ref<string | null>(null)
const viewport = ref<BaseCanvasViewport>({ x: 72, y: 64, zoom: 1 })
const paletteWidth = ref(240)
const detailsWidth = ref(340)
const resizeState = ref<null | { side: 'palette' | 'details'; startX: number; startWidth: number }>(null)
const detailsStep = ref<'choose' | 'configure'>('choose')

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
    height: node.height ?? 92,
  })),
)
const graphSummary = computed(() =>
  graph.value.nodes.length === 0 ? 'No active graph' : `${graph.value.nodes.length} nodes / ${graph.value.edges.length} links`,
)
const documentTitle = computed(() => document.value.scope.type === 'element' ? document.value.scope.label : 'Page Blueprint')
const selectedLabel = computed(() => activeNode.value?.label ?? 'Canvas')
const activeNode = computed(() => selection.value[0] ? nodeForItem(selection.value[0]) : null)
const selectedEdge = computed(() => selectedEdgeId.value ? graph.value.edges.find((edge) => edge.id === selectedEdgeId.value) ?? null : null)
const detailsStepLabel = computed(() => detailsStep.value === 'choose' ? 'Select source' : activeNode.value?.kind ?? 'Configure')
const edgeToolbarPosition = computed(() => {
  if (!selectedEdge.value) return { x: 0, y: 0 }
  const from = nodeForItem(selectedEdge.value.from)
  const to = nodeForItem(selectedEdge.value.to)
  if (!from || !to) return { x: 0, y: 0 }
  return {
    x: (from.x + (from.width ?? 184) + to.x) / 2 - 14,
    y: (from.y + ((from.height ?? 86) / 2) + to.y + ((to.height ?? 86) / 2)) / 2 - 14,
  }
})
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

function clearCanvasSelection() {
  selection.value = []
  selectedEdgeId.value = null
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

function startConnection(nodeId: string) {
  connectionStartNodeId.value = nodeId
}

function finishConnection(nodeId: string) {
  const from = connectionStartNodeId.value
  connectionStartNodeId.value = null
  if (!from || from === nodeId) return
  if (graph.value.edges.some((edge) => edge.from === from && edge.to === nodeId)) return
  persistBlueprintDocument({
    ...document.value,
    graph: {
      nodes: [...graph.value.nodes],
      edges: [
        ...graph.value.edges,
        {
          id: `edge:${from}:${nodeId}:${Date.now().toString(36)}`,
          from,
          to: nodeId,
        },
      ],
    },
    selectedNodeIds: selection.value,
    viewport: viewport.value,
    updatedAt: new Date().toISOString(),
  })
}

function deleteSelectedEdge() {
  const edgeId = selectedEdgeId.value
  if (!edgeId) return
  persistBlueprintDocument({
    ...document.value,
    graph: {
      nodes: [...graph.value.nodes],
      edges: graph.value.edges.filter((edge) => edge.id !== edgeId),
    },
    selectedNodeIds: selection.value,
    viewport: viewport.value,
    updatedAt: new Date().toISOString(),
  })
  selectedEdgeId.value = null
}

function deleteNode(nodeId: string) {
  persistBlueprintDocument({
    ...document.value,
    graph: {
      nodes: graph.value.nodes.filter((node) => node.id !== nodeId),
      edges: graph.value.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
    },
    selectedNodeIds: selection.value.filter((id) => id !== nodeId),
    viewport: viewport.value,
    updatedAt: new Date().toISOString(),
  })
  selection.value = selection.value.filter((id) => id !== nodeId)
}

function duplicateNode(nodeId: string) {
  const source = nodeForItem(nodeId)
  if (!source) return
  const node: PageBlueprintNode = {
    ...source,
    id: `node:${source.kind}:${Date.now().toString(36)}`,
    x: source.x + 32,
    y: source.y + 32,
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
    height: 92,
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
  const startY = from.y + ((from.height ?? 92) / 2)
  const endX = to.x
  const endY = to.y + ((to.height ?? 92) / 2)
  const control = Math.max(48, (endX - startX) / 2)
  return `M ${startX} ${startY} C ${startX + control} ${startY}, ${endX - control} ${endY}, ${endX} ${endY}`
}
</script>
