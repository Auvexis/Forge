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
        <div class="web-page-blueprint__panel-title">
          <LucideIcon name="blocks" :size="13" />
          <strong>Node Library</strong>
        </div>
        <BaseButton
          variant="ghost"
          size="icon"
          icon-left="refresh-cw"
          title="Refresh actions"
          :loading="actionsStore.isLoading"
          @click="actionsStore.loadAvailableActions()"
        />
      </header>
      <div class="web-page-blueprint__palette-tools">
        <label class="web-page-blueprint__search">
          <LucideIcon name="search" :size="12" />
          <input v-model="paletteQuery" type="search" placeholder="Search nodes" aria-label="Search Blueprint nodes" />
          <kbd v-if="!paletteQuery">{{ paletteItems.length }} nodes</kbd>
          <button v-else type="button" title="Clear search" @click="paletteQuery = ''">
            <LucideIcon name="x" :size="11" />
          </button>
        </label>
      </div>
      <div class="web-page-blueprint__palette-body">
        <section
          v-for="group in filteredPaletteGroups"
          :key="group.id"
          class="web-page-blueprint__palette-group"
        >
          <header>
            <span>{{ group.label }}</span>
            <small>{{ group.items.length }}</small>
          </header>
          <button
            v-for="item in group.items"
            :key="item.id"
            class="web-page-blueprint__palette-item"
            type="button"
            @click="addPaletteNode(item)"
          >
            <span class="web-page-blueprint__palette-icon" :data-kind="item.kind">
              <LucideIcon :name="item.icon" :size="14" />
            </span>
            <span class="web-page-blueprint__palette-copy">
              <strong>{{ item.label }}</strong>
              <small>{{ item.detail }}</small>
            </span>
            <LucideIcon class="web-page-blueprint__palette-add" name="plus" :size="12" />
          </button>
        </section>
        <div v-if="filteredPaletteGroups.length === 0" class="web-page-blueprint__palette-empty">
          <span>No matching nodes</span>
          <button type="button" @click="paletteQuery = ''">Clear search</button>
        </div>
      </div>
    </aside>

    <div class="web-page-blueprint__graph">
      <header class="web-page-blueprint__header">
        <div class="web-page-blueprint__graph-title">
          <LucideIcon name="workflow" :size="13" />
          <div>
          <strong>{{ documentTitle }}</strong>
          <span>{{ graphSummary }}</span>
          </div>
        </div>
        <span class="web-page-blueprint__header-meta">
          <LucideIcon name="mouse-pointer-2" :size="13" />
          {{ selectedLabel }}
        </span>
      </header>

      <BaseCanvas
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
            v-if="previewConnectionPath"
            class="web-page-blueprint__edge web-page-blueprint__edge--preview"
            :d="previewConnectionPath"
          />
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
              @pointerdown.stop.prevent="startConnection(item.id, $event)"
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
              <span class="web-page-blueprint__node-icon">
                <LucideIcon :name="nodeForItem(item.id)?.icon ?? 'box'" :size="15" />
              </span>
              <span class="web-page-blueprint__node-title">
                <small>{{ nodeKindLabel(nodeForItem(item.id)?.kind) }}</small>
                <strong>{{ nodeForItem(item.id)?.label }}</strong>
              </span>
              <LucideIcon name="grip-vertical" :size="12" class="web-page-blueprint__node-grip" />
            </header>
            <div class="web-page-blueprint__node-body">
              <span>{{ nodeForItem(item.id)?.detail || 'No configuration' }}</span>
              <code>{{ shortNodeId(item.id) }}</code>
            </div>
            <footer class="web-page-blueprint__node-footer">
              <span><i class="web-page-blueprint__port-dot" /> Input</span>
              <span>Output <i class="web-page-blueprint__port-dot" /></span>
            </footer>
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
        <div class="web-page-blueprint__panel-title">
          <LucideIcon name="sliders-horizontal" :size="13" />
          <strong>Inspector</strong>
        </div>
        <span>{{ activeNode ? '1 selected' : 'Canvas' }}</span>
      </header>
      <div class="web-page-blueprint__inspector">
        <PageBlueprintNodeInspector
          v-if="activeNode"
          :node="activeNode"
          :scope="document.scope"
          @configure-workflow="configureActiveWorkflow"
          @clear-workflow="clearActiveWorkflow"
          @output-bound="addOutputBindingNode"
          @output-unbound="removeBindingNode"
          @collection-bound="addCollectionBindingNode"
          @collection-unbound="removeBindingNode"
        />
        <div v-else class="web-page-blueprint__inspector-empty">
          <LucideIcon name="mouse-pointer-2" :size="18" />
          <strong>No node selected</strong>
          <span>Select a node or connection to inspect its properties.</span>
        </div>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseCanvas from '@/shared/base-canvas/BaseCanvas.vue'
import type { BaseCanvasItem, BaseCanvasItemsMoveEvent, BaseCanvasViewport } from '@/shared/base-canvas/types.ts'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageActionCollectionBinding, PageActionOutputBinding, PageActionTriggerSummary } from '@/core/page-actions'
import { usePagesStore } from '../stores/pages.store.ts'
import { usePageActionsStore } from '../data-actions/stores/page-actions.store.ts'
import { usePageEditorStore } from '../stores/page-editor.store.ts'
import { blueprintScopeId, createPageBlueprintDocument } from './pageBlueprintDocument.ts'
import PageBlueprintNodeInspector from './PageBlueprintNodeInspector.vue'
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
const editorStore = usePageEditorStore()
const selection = ref<string[]>([])
const selectedEdgeId = ref<string | null>(null)
const connectionStartNodeId = ref<string | null>(null)
const connectionPointer = ref<{ x: number; y: number } | null>(null)
const viewport = ref<BaseCanvasViewport>({ x: 72, y: 64, zoom: 1 })
const paletteWidth = ref(260)
const detailsWidth = ref(340)
const resizeState = ref<null | { side: 'palette' | 'details'; startX: number; startWidth: number }>(null)
const paletteQuery = ref('')

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
    width: node.width ?? 208,
    height: node.height ?? 112,
  })),
)
const graphSummary = computed(() =>
  graph.value.nodes.length === 0 ? 'No active graph' : `${graph.value.nodes.length} nodes / ${graph.value.edges.length} links`,
)
const documentTitle = computed(() => document.value.scope.type === 'element' ? document.value.scope.label : 'Page Blueprint')
const selectedLabel = computed(() => activeNode.value?.label ?? 'Canvas')
const activeNode = computed(() => selection.value[0] ? nodeForItem(selection.value[0]) : null)
const selectedEdge = computed(() => selectedEdgeId.value ? graph.value.edges.find((edge) => edge.id === selectedEdgeId.value) ?? null : null)
const previewConnectionPath = computed(() => {
  const fromId = connectionStartNodeId.value
  const pointer = connectionPointer.value
  const from = fromId ? nodeForItem(fromId) : null
  if (!from || !pointer) return ''
  const startX = from.x + (from.width ?? 208)
  const startY = from.y + ((from.height ?? 112) / 2)
  const control = Math.max(48, Math.abs(pointer.x - startX) / 2)
  return `M ${startX} ${startY} C ${startX + control} ${startY}, ${pointer.x - control} ${pointer.y}, ${pointer.x} ${pointer.y}`
})
const edgeToolbarPosition = computed(() => {
  if (!selectedEdge.value) return { x: 0, y: 0 }
  const from = nodeForItem(selectedEdge.value.from)
  const to = nodeForItem(selectedEdge.value.to)
  if (!from || !to) return { x: 0, y: 0 }
  return {
    x: (from.x + (from.width ?? 208) + to.x) / 2 - 14,
    y: (from.y + ((from.height ?? 112) / 2) + to.y + ((to.height ?? 112) / 2)) / 2 - 14,
  }
})
const paletteItems = computed<Array<{ id: string; label: string; detail: string; icon: string; kind: PageBlueprintNodeKind }>>(() => [
  { id: 'page-event', label: 'Page Event', detail: 'Start from click, submit, or mount', icon: 'radio', kind: 'event' },
  { id: 'run-workflow', label: 'Run Workflow', detail: `${actionsStore.workflows.length} published workflow groups`, icon: 'workflow', kind: 'workflow-action' },
  { id: 'read-element', label: 'Read Element', detail: 'Use value/text from the selected page element', icon: 'box-select', kind: 'element' },
  { id: 'transform-data', label: 'Transform Data', detail: 'Prepare values before binding or action input', icon: 'braces', kind: 'javascript' },
])
const filteredPaletteGroups = computed(() => {
  const query = paletteQuery.value.trim().toLowerCase()
  const items = query
    ? paletteItems.value.filter((item) => `${item.label} ${item.detail} ${item.kind}`.toLowerCase().includes(query))
    : paletteItems.value
  const definitions = [
    { id: 'events', label: 'Events', kinds: ['event'] },
    { id: 'actions', label: 'Actions', kinds: ['workflow-action', 'javascript'] },
    { id: 'data', label: 'Data & Bindings', kinds: ['element', 'input-binding', 'result-binding', 'collection-binding'] },
  ]
  return definitions
    .map((group) => ({ ...group, items: items.filter((item) => group.kinds.includes(item.kind)) }))
    .filter((group) => group.items.length > 0)
})
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

function startConnection(nodeId: string, event: PointerEvent) {
  connectionStartNodeId.value = nodeId
  selectedEdgeId.value = null
  connectionPointer.value = pointerWorldPoint(event)
  window.addEventListener('pointermove', moveConnectionPreview)
  window.addEventListener('pointerup', cancelConnectionPreview, { once: true })
}

function finishConnection(nodeId: string) {
  const from = connectionStartNodeId.value
  clearConnectionPreview()
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

function moveConnectionPreview(event: PointerEvent) {
  connectionPointer.value = pointerWorldPoint(event)
}

function cancelConnectionPreview() {
  clearConnectionPreview()
}

function clearConnectionPreview() {
  connectionStartNodeId.value = null
  connectionPointer.value = null
  window.removeEventListener('pointermove', moveConnectionPreview)
}

function pointerWorldPoint(event: PointerEvent) {
  const rect = window.document.querySelector('.web-page-blueprint__surface')?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  return {
    x: (event.clientX - rect.left - viewport.value.x) / viewport.value.zoom,
    y: (event.clientY - rect.top - viewport.value.y) / viewport.value.zoom,
  }
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

function addPaletteNode(item: { id: string; label: string; detail: string; icon: string; kind: PageBlueprintNodeKind }) {
  if (item.id === 'page-event') {
    addNodeToGraph(createBlueprintNode({
      kind: 'event',
      label: 'Page Event',
      detail: 'Click, submit, or mount',
      icon: 'radio',
    }))
    return
  }
  if (item.id === 'run-workflow') {
    addNodeToGraph(createBlueprintNode({
      kind: 'workflow-action',
      label: 'Run Workflow',
      detail: 'Choose a published trigger in Properties',
      icon: 'workflow',
    }))
    return
  }
  if (item.id === 'read-element') {
    addSelectedElementNode()
    return
  }
  const node: PageBlueprintNode = {
    id: `node:${item.kind}:${Date.now().toString(36)}`,
    kind: item.kind,
    label: item.label,
    detail: item.detail,
    icon: item.icon,
    x: Math.round((-viewport.value.x + 120) / viewport.value.zoom),
    y: Math.round((-viewport.value.y + 120 + graph.value.nodes.length * 18) / viewport.value.zoom),
    width: 208,
    height: 112,
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

function addSelectedElementNode() {
  const block = editorStore.selectedBlock
  if (!block) return
  const node = createBlueprintNode({
    kind: 'element',
    label: String(block.props?.label ?? block.props?.text ?? block.elementId ?? block.id),
    detail: `${block.tag} / ${block.id}`,
    icon: 'box-select',
  })
  addNodeToGraph(node)
}

function createBlueprintNode(input: {
  id?: string
  kind: PageBlueprintNodeKind
  label: string
  detail: string
  icon: string
}): PageBlueprintNode {
  return {
    id: input.id ?? `node:${input.kind}:${Date.now().toString(36)}`,
    kind: input.kind,
    label: input.label,
    detail: input.detail,
    icon: input.icon,
    x: Math.round((-viewport.value.x + 120) / viewport.value.zoom),
    y: Math.round((-viewport.value.y + 120 + graph.value.nodes.length * 18) / viewport.value.zoom),
    width: 208,
    height: 112,
  }
}

function addNodeToGraph(node: PageBlueprintNode, connectFrom?: string) {
  const nodes = graph.value.nodes.some((item) => item.id === node.id)
    ? graph.value.nodes.map((item) => item.id === node.id ? node : item)
    : [...graph.value.nodes, node]
  const edges = connectFrom && graph.value.nodes.some((item) => item.id === connectFrom)
    ? [
      ...graph.value.edges,
      {
        id: `edge:${connectFrom}:${node.id}:${Date.now().toString(36)}`,
        from: connectFrom,
        to: node.id,
      },
    ]
    : [...graph.value.edges]
  persistBlueprintDocument({
    ...document.value,
    graph: { nodes, edges },
    selectedNodeIds: [node.id],
    viewport: viewport.value,
    updatedAt: new Date().toISOString(),
  })
  selection.value = [node.id]
}

function configureActiveWorkflow(trigger: PageActionTriggerSummary) {
  const nodeId = activeNode.value?.id
  const action = actionsStore.selectedAction
  if (!nodeId || !action) return
  patchNode(nodeId, {
    label: trigger.workflowName,
    detail: `${trigger.name} · ${trigger.type}`,
    actionId: action.id,
    workflowId: trigger.workflowId,
    triggerId: trigger.id,
  })
}

function clearActiveWorkflow() {
  const nodeId = activeNode.value?.id
  if (!nodeId) return
  patchNode(nodeId, {
    label: 'Run Workflow',
    detail: 'Choose a published trigger in Properties',
    actionId: undefined,
    workflowId: undefined,
    triggerId: undefined,
  })
}

function addOutputBindingNode(binding: PageActionOutputBinding) {
  addBindingNode({
    id: `output:${binding.id}`,
    kind: 'result-binding',
    label: binding.resultPath,
    detail: `${binding.target.label}.${binding.target.property}`,
    icon: 'log-out',
  })
}

function addCollectionBindingNode(binding: PageActionCollectionBinding) {
  addBindingNode({
    id: `collection:${binding.id}`,
    kind: 'collection-binding',
    label: binding.collectionPath,
    detail: `${binding.mode ?? 'repeater'} → ${binding.targetElementId}`,
    icon: binding.mode === 'table' ? 'table-2' : 'repeat',
  })
}

function addBindingNode(input: Pick<PageBlueprintNode, 'id' | 'kind' | 'label' | 'detail' | 'icon'>) {
  const source = activeNode.value
  if (!source) return
  const existing = nodeForItem(input.id)
  const node: PageBlueprintNode = existing ?? {
    ...input,
    x: source.x + (source.width ?? 208) + 96,
    y: source.y + graph.value.nodes.filter((item) => item.kind === input.kind).length * 128,
    width: 208,
    height: 112,
  }
  const edgeExists = graph.value.edges.some((edge) => edge.from === source.id && edge.to === node.id)
  persistBlueprintDocument({
    ...document.value,
    graph: {
      nodes: existing ? [...graph.value.nodes] : [...graph.value.nodes, node],
      edges: edgeExists ? [...graph.value.edges] : [...graph.value.edges, {
        id: `edge:${source.id}:${node.id}`,
        from: source.id,
        to: node.id,
        label: input.label,
      }],
    },
    selectedNodeIds: [source.id],
    viewport: viewport.value,
    updatedAt: new Date().toISOString(),
  })
  selection.value = [source.id]
}

function removeBindingNode(bindingId: string) {
  const ids = new Set([`output:${bindingId}`, `collection:${bindingId}`])
  persistBlueprintDocument({
    ...document.value,
    graph: {
      nodes: graph.value.nodes.filter((node) => !ids.has(node.id)),
      edges: graph.value.edges.filter((edge) => !ids.has(edge.from) && !ids.has(edge.to)),
    },
    selectedNodeIds: [...selection.value],
    viewport: viewport.value,
    updatedAt: new Date().toISOString(),
  })
}

function patchNode(nodeId: string, patch: Partial<PageBlueprintNode>) {
  persistBlueprintDocument({
    ...document.value,
    graph: {
      nodes: graph.value.nodes.map((node) => node.id === nodeId ? { ...node, ...patch } : node),
      edges: [...graph.value.edges],
    },
    selectedNodeIds: [nodeId],
    viewport: viewport.value,
    updatedAt: new Date().toISOString(),
  })
  selection.value = [nodeId]
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
  const startX = from.x + (from.width ?? 208)
  const startY = from.y + ((from.height ?? 112) / 2)
  const endX = to.x
  const endY = to.y + ((to.height ?? 112) / 2)
  const control = Math.max(48, (endX - startX) / 2)
  return `M ${startX} ${startY} C ${startX + control} ${startY}, ${endX - control} ${endY}, ${endX} ${endY}`
}

function nodeKindLabel(kind?: PageBlueprintNodeKind) {
  if (!kind) return 'Node'
  return ({
    event: 'Event',
    'workflow-action': 'Workflow Action',
    'input-binding': 'Input Binding',
    'result-binding': 'Result Binding',
    'collection-binding': 'Collection Binding',
    javascript: 'Transform',
    element: 'Page Element',
  } satisfies Record<PageBlueprintNodeKind, string>)[kind]
}

function shortNodeId(id: string) {
  const segment = id.split(':').at(-1) ?? id
  return segment.length > 18 ? `${segment.slice(0, 15)}...` : segment
}
</script>
