<template>
  <AppPage>
    <main class="plugin-creator-page">
      <section class="plugin-creator-page__workspace" aria-label="Plugin creator canvas">
        <div class="plugin-creator-page__canvas-shell">
          <PluginCreatorHeader
            :title="store.activeBlueprint?.metadata.name ?? 'Low-code plugin workspace'"
            :active-blueprint="store.activeBlueprint"
            :blueprints="store.blueprints"
            :versions="store.versions"
            :is-dirty="store.isDirty"
            :is-saving="store.isSaving"
            @new-plugin="createNewPlugin"
            @open-plugin="openPluginBlueprint"
            @export-zip="exportActivePluginZip"
            @discard-draft="discardDraft"
            @settings="openWorkspaceModal('metadata')"
            @versions="openWorkspaceModal('versions')"
            @rollback="rollbackToReleaseSnapshot"
            @run="runSelectedMethod"
            @save="saveDraft"
            @publish="publishActiveBlueprint"
          />
          <div
            v-if="store.error"
            class="plugin-creator-page__status plugin-creator-page__status--error"
          >
            {{ store.error }}
          </div>
          <div v-else-if="store.isLoading" class="plugin-creator-page__status">
            Loading plugin workspace...
          </div>
          <PluginCreatorCanvas
            ref="canvasRef"
            :blueprint="store.activeBlueprint"
            :tool="activeTool"
            @select-node="selectedNodeId = $event"
            @update-node-position="updateNodePosition"
            @connect-nodes="connectNodes"
            @remove-edges="store.removeEdges"
            @delete-selected="deleteSelectedNodes"
            @duplicate-selected="duplicateSelectedNodes"
            @add-first-node="openAddBlocksPanel"
            @open-node-settings="openNodeSettingsModal"
          />
          <PluginCreatorCodePreviewMinimap
            :blueprint="store.activeBlueprint"
            :selected-node-id="selectedNodeId"
          />
          <PluginCreatorFloatingToolbar
            :is-dirty="store.isDirty"
            :is-saving="store.isSaving"
            @tool-change="setCanvasTool"
            @add-item="openAddBlocksPanel"
            @run="runSelectedMethod"
            @save="saveDraft"
            @publish="publishActiveBlueprint"
            @undo="store.undo"
            @redo="store.redo"
            @zoom="zoomCanvas"
            @clear-execution="clearExecution"
          />
          <PluginCreatorExecutionBottomPanel
            :has-execution="executionStore.hasExecution"
            :timeline="executionStore.timeline"
            :node-statuses="executionStore.nodeStatuses"
            :selected-node-id="selectedNodeId"
            @clear-execution="clearExecution"
          />
        </div>
      </section>

      <PluginCreatorWorkspaceModal
        :is-open="isWorkspaceModalOpen"
        :view="workspaceModalView"
        :blueprint="store.activeBlueprint"
        :selected-node-id="selectedNodeId"
        :last-test-result="store.lastTestResult"
        :versions="store.versions"
        :is-running="store.isTesting"
        :is-loading="store.isLoading"
        @close="isWorkspaceModalOpen = false"
        @update-metadata="store.updateMetadata"
        @update-icons="store.updateIcons"
        @upload-icon="store.uploadIcon"
        @update-node="store.updateNode"
        @update-method="store.updateMethod"
        @update-input="store.updateMethodInput"
        @update-credential="store.updateCredentialField"
        @update-request="store.updateMethodRequest"
        @add-credential="store.addCredentialField"
        @test-method="runMethodTestAndApplyTrace"
        @load-versions="store.loadVersions"
        @rollback="rollbackToReleaseSnapshot"
      />
      <PluginCreatorCreatePluginModal
        :is-open="isCreatePluginModalOpen"
        :existing-handles="store.blueprints.map((blueprint) => blueprint.metadata.handle)"
        @close="isCreatePluginModalOpen = false"
        @create="createPluginFromModal"
      />
      <PluginCreatorNodeSettingsModal
        :is-open="isNodeSettingsModalOpen"
        :blueprint="store.activeBlueprint"
        :node-id="selectedNodeId"
        :last-test-result="store.lastTestResult"
        :is-dirty="store.isDirty"
        :is-saving="store.isSaving"
        @close="isNodeSettingsModalOpen = false"
        @save="saveDraft"
        @run="runSelectedMethod"
        @update-node="store.updateNode"
        @rename-node="renameSelectedNode"
        @update-method="store.updateMethod"
        @update-input="store.updateMethodInput"
        @update-credential="store.updateCredentialField"
        @update-request="store.updateMethodRequest"
      />
    </main>
  </AppPage>
</template>

<script setup lang="ts">
import AppPage from '@/shared/components/layout/AppPage.vue'
import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import { useEventBus } from '@/shared/composables/useEventBus'
import { useConfirm } from '@/shared/composables/useConfirm'
import PluginCreatorHeader from '@/features/plugin-creator/components/PluginCreatorHeader.vue'
import PluginCreatorCanvas from '@/features/plugin-creator/components/PluginCreatorCanvas.vue'
import PluginCreatorFloatingToolbar from '@/features/plugin-creator/components/PluginCreatorFloatingToolbar.vue'
import PluginCreatorAddItemPanel, {
  type PluginCreatorAddItemType,
} from '@/features/plugin-creator/components/PluginCreatorAddItemPanel.vue'
import PluginCreatorWorkspaceModal, {
  type PluginCreatorWorkspaceView,
} from '@/features/plugin-creator/components/PluginCreatorWorkspaceModal.vue'
import PluginCreatorCreatePluginModal from '@/features/plugin-creator/components/PluginCreatorCreatePluginModal.vue'
import PluginCreatorNodeSettingsModal from '@/features/plugin-creator/components/PluginCreatorNodeSettingsModal.vue'
import PluginCreatorCodePreviewMinimap from '@/features/plugin-creator/components/PluginCreatorCodePreviewMinimap.vue'
import PluginCreatorExecutionBottomPanel from '@/features/plugin-creator/components/PluginCreatorExecutionBottomPanel.vue'
import { usePluginCreatorStore } from '@/features/plugin-creator'
import { usePluginCreatorExecutionStore } from '@/features/plugin-creator/stores/pluginCreatorExecution.store'
import type {
  PluginBlueprintNode,
  PluginBlueprintPosition,
  PluginBlueprintNodeType,
  CreatePluginBlueprintPayload,
  PluginBlueprintIconSlot,
  PluginCreatorTestMethodPayload,
} from '@/core/types/plugin-creator.types'
import { markRaw, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type ToolbarTool = 'cursor' | 'pan' | 'delete'

const store = usePluginCreatorStore()
const executionStore = usePluginCreatorExecutionStore()
const appPanelStore = useAppPanelStore()
const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()
const canvasRef = ref<{
  deleteSelection: () => void
  zoomTo: (value: number) => void
  fitView: () => void
  centerPosition: () => PluginBlueprintPosition
} | null>(null)
const activeTool = ref<ToolbarTool>('cursor')
const selectedNodeId = ref<string | null>(null)
const isWorkspaceModalOpen = ref(false)
const isCreatePluginModalOpen = ref(false)
const isCreatePluginFirstSave = ref(false)
const isNodeSettingsModalOpen = ref(false)
const workspaceModalView = ref<PluginCreatorWorkspaceView>('metadata')
const quickAddSourceId = ref<string | null>(null)
const quickAddSourceHandle = ref<string | null>(null)
const pendingInsertEdgeId = ref<string | null>(null)
const pendingInsertSourceId = ref<string | null>(null)
const pendingInsertTargetId = ref<string | null>(null)
const pendingInsertTargetHandle = ref<string | null>(null)

const quickAddBus = useEventBus<{ sourceId: string; sourceHandle?: string }>('node:quick-add')
quickAddBus.on((payload) => {
  quickAddSourceHandle.value = payload?.sourceHandle ?? null
  openAddBlocksPanel(payload?.sourceId ?? null)
})

const quickAddBetweenBus = useEventBus<{
  edgeId: string
  sourceId: string
  targetId: string
  sourceHandle?: string
  targetHandle?: string
}>('edge:quick-add-between')
quickAddBetweenBus.on((payload) => {
  pendingInsertEdgeId.value = payload.edgeId
  pendingInsertSourceId.value = payload.sourceId
  pendingInsertTargetId.value = payload.targetId
  pendingInsertTargetHandle.value = payload.targetHandle ?? null
  quickAddSourceHandle.value = payload.sourceHandle ?? null
  openAddBlocksPanel(payload.sourceId)
})

const addItemBus = useEventBus<PluginCreatorAddItemType>('plugin-creator:add-item')
addItemBus.on((type) => {
  addPluginCreatorBlock(type)
})

const nodeToolbarBus = useEventBus<{ action: 'duplicate' | 'delete'; nodeId: string }>(
  'node:toolbar-action',
)
nodeToolbarBus.on((payload) => {
  if (!payload?.nodeId || !store.activeBlueprint?.canvas.nodes[payload.nodeId]) return
  if (payload.action === 'delete') {
    deleteSelectedNodes([payload.nodeId])
  } else {
    duplicateNode(payload.nodeId)
  }
})

onMounted(() => {
  void loadInitialBlueprint()
})

async function loadInitialBlueprint() {
  const blueprints = await store.listBlueprints()
  const routePluginId = Array.isArray(route.params.pluginId)
    ? route.params.pluginId[0]
    : route.params.pluginId

  if (routePluginId) {
    const blueprint = await store.loadBlueprint(routePluginId)
    void store.loadVersions()
    selectDefaultNode()
    fitCanvasSoon()
    return blueprint
  }

  const [firstBlueprint] = blueprints
  if (firstBlueprint) {
    const blueprint = await store.loadBlueprint(firstBlueprint.id)
    await router.replace({ name: 'plugin-creator-detail', params: { pluginId: firstBlueprint.id } })
    void store.loadVersions()
    selectDefaultNode()
    fitCanvasSoon()
    return blueprint
  }

  const blueprint = store.createLocalDraft()
  selectDefaultNode()
  fitCanvasSoon()
  return blueprint
}

async function createNewPlugin() {
  if (!(await confirmUnsavedChanges())) return
  isCreatePluginFirstSave.value = false
  isCreatePluginModalOpen.value = true
}

async function createPluginFromModal(
  payload: CreatePluginBlueprintPayload,
  iconFiles: Partial<Record<PluginBlueprintIconSlot, File>> = {},
) {
  isCreatePluginModalOpen.value = false
  const blueprint = isCreatePluginFirstSave.value
    ? await store.saveNewBlueprint(payload)
    : await store.createBlueprint(payload)
  isCreatePluginFirstSave.value = false
  if (!blueprint) return
  for (const [slot, file] of Object.entries(iconFiles) as Array<[PluginBlueprintIconSlot, File]>) {
    await store.uploadIcon(slot, file)
  }
  await router.replace({ name: 'plugin-creator-detail', params: { pluginId: blueprint.id } })
  void store.loadVersions()
  selectDefaultNode()
  fitCanvasSoon()
}

async function openPluginBlueprint(blueprintId: string) {
  if (blueprintId === store.activeBlueprint?.id || !(await confirmUnsavedChanges())) return

  const blueprint = await store.loadBlueprint(blueprintId)
  await router.replace({ name: 'plugin-creator-detail', params: { pluginId: blueprint.id } })
  void store.loadVersions()
  selectDefaultNode()
  fitCanvasSoon()
}

async function exportActivePluginZip() {
  const blueprint = store.activeBlueprint
  if (!blueprint) return

  const blob = await store.exportZip()
  if (!blob) return

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${blueprint.metadata.handle || blueprint.id}.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function discardDraft() {
  const blueprintId = store.activeBlueprint?.id
  if (!blueprintId || !store.isDirty) return
  const ok = await confirmDiscardDraft()
  if (!ok) return

  await store.loadBlueprint(blueprintId)
  void store.loadVersions()
  selectDefaultNode()
  fitCanvasSoon()
}

function selectDefaultNode() {
  const nodes = store.activeBlueprint?.canvas.nodes
  selectedNodeId.value = nodes ? (Object.keys(nodes)[0] ?? null) : null
}

function openAddBlocksPanel(sourceId: string | null = null) {
  quickAddSourceId.value = sourceId
  if (!sourceId) {
    clearQuickAddState()
  }
  appPanelStore.openPanel({
    id: 'plugin-creator-add-blocks',
    title: 'Add Block',
    component: markRaw(PluginCreatorAddItemPanel),
    props: {},
    position: 'right',
    width: 'md',
    resizable: true,
    resizeSide: 'left',
  })
}

function closeAddBlocksPanel() {
  if (appPanelStore.panelId === 'plugin-creator-add-blocks') {
    appPanelStore.closePanel()
  }
}

function openNodeSettingsModal(nodeId: string) {
  selectedNodeId.value = nodeId
  isNodeSettingsModalOpen.value = true
}

function renameSelectedNode(payload: { oldId: string; newId: string }) {
  const renamed = store.renameNode(payload.oldId, payload.newId)
  if (renamed) {
    selectedNodeId.value = payload.newId.trim()
  }
  return renamed
}

function openWorkspaceModal(view: PluginCreatorWorkspaceView) {
  workspaceModalView.value = view
  isWorkspaceModalOpen.value = true
  if (view === 'versions') {
    void store.loadVersions()
  }
}

function setCanvasTool(tool: ToolbarTool) {
  activeTool.value = tool
  if (tool === 'delete') {
    canvasRef.value?.deleteSelection()
  }
}

function zoomCanvas(value: number) {
  canvasRef.value?.zoomTo(value / 100)
}

function updateNodePosition(payload: { nodeId: string; position: PluginBlueprintPosition }) {
  store.updateNode(payload.nodeId, { position: payload.position })
}

function deleteSelectedNodes(nodeIds: string[]) {
  store.removeNodes(nodeIds)
  if (selectedNodeId.value && nodeIds.includes(selectedNodeId.value)) {
    selectDefaultNode()
  }
}

function connectNodes(payload: {
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}) {
  addPluginCreatorEdge(payload)
  if (quickAddSourceId.value === payload.source) {
    clearQuickAddState()
    if (appPanelStore.panelId === 'plugin-creator-add-blocks') {
      appPanelStore.closePanel()
    }
  }
}

function addPluginCreatorEdge(payload: {
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}) {
  store.addEdge({
    id: `edge_${payload.source}_${payload.target}_${Date.now()}`,
    ...payload,
  })
}

function addPluginCreatorBlock(type: PluginCreatorAddItemType) {
  const sourceId = quickAddSourceId.value
  const sourceHandle = quickAddSourceHandle.value
  const insertEdgeId = pendingInsertEdgeId.value
  const insertSourceId = pendingInsertSourceId.value
  const insertTargetId = pendingInsertTargetId.value
  const insertTargetHandle = pendingInsertTargetHandle.value
  const node = createNode(type)
  prepareSpaceForNode(node.position, [sourceId, insertSourceId, insertTargetId].filter(Boolean) as string[])
  store.addNode(node)
  if (type === 'method') {
    addMethodFromNode(node)
  }
  if (type === 'codeBlock' && methodIdFromNode(node)) {
    upsertNodeCodeBlock(node)
  }
  if (insertEdgeId && insertSourceId && insertTargetId) {
    insertNodeBetween({
      edgeId: insertEdgeId,
      newNodeId: node.id,
      sourceId: insertSourceId,
      targetId: insertTargetId,
      sourceHandle,
      targetHandle: insertTargetHandle,
    })
  } else if (sourceId) {
    addPluginCreatorEdge({
      source: sourceId,
      target: node.id,
      sourceHandle: sourceHandle ?? undefined,
    })
  }
  clearQuickAddState()
  selectedNodeId.value = node.id
  closeAddBlocksPanel()
}

function duplicateNode(nodeId: string) {
  const existing = store.activeBlueprint?.canvas.nodes[nodeId]
  if (!existing) return
  const id = `${existing.type}_${Date.now()}`
  const position = resolveNodePositionOverlap({
    x: existing.position.x + 40,
    y: existing.position.y + 40,
  }, [existing.id])
  store.addNode({
    ...existing,
    id,
    position,
    data: { ...existing.data },
  })
  selectedNodeId.value = id
}

function methodIdFromNode(node: PluginBlueprintNode): string | null {
  return typeof node.data.methodId === 'string' ? node.data.methodId : null
}

function upsertNodeCodeBlock(node: PluginBlueprintNode) {
  const methodId = methodIdFromNode(node)
  const method = store.activeBlueprint?.methods.find((candidate) => candidate.id === methodId)
  if (!method) return
  const codeBlock = {
    id: node.id,
    name: String(node.data.name ?? node.data.label ?? 'Code Block'),
    source: 'return previous;',
  }
  store.updateMethod(method.id, {
    codeBlocks: [...(method.codeBlocks ?? []), codeBlock],
  })
  store.updateNode(node.id, {
    data: {
      codeBlockId: codeBlock.id,
      source: codeBlock.source,
    },
  })
}

function addMethodFromNode(node: PluginBlueprintNode) {
  const methodId = methodIdFromNode(node) ?? node.id
  const methodCount = store.activeBlueprint?.methods.length ?? 0
  const handle = `method${methodCount + 1}`
  store.addMethod({
    id: methodId,
    handle,
    name: String(node.data.name ?? node.data.label ?? 'Untitled Method'),
    description: '',
    inputs: [],
    request: {
      method: 'GET',
      url: 'https://api.example.com',
      headers: [],
      query: [],
      body: { type: 'none' },
    },
    responseMapping: [],
    errorMapping: [],
    codeBlocks: [],
  })
  store.updateNode(node.id, {
    data: {
      methodId,
      handle,
    },
  })
}

function duplicateSelectedNodes(nodeIds: string[]) {
  for (const nodeId of nodeIds) {
    duplicateNode(nodeId)
  }
}

function createNode(type: PluginCreatorAddItemType): PluginBlueprintNode {
  const nodeCount = Object.keys(store.activeBlueprint?.canvas.nodes ?? {}).length
  const methodId = store.activeBlueprint?.methods[0]?.id
  const id = `${type}_${Date.now()}_${nodeCount}`
  const nodeMethodId = type === 'method' ? id : methodId
  const position = getNewNodePosition(quickAddSourceId.value, pendingInsertTargetId.value)

  return {
    id,
    type: type as PluginBlueprintNodeType,
    position,
    data: {
      label: nodeLabel(type),
      name: nodeLabel(type),
      methodId: nodeMethodId,
      ...defaultNodeData(type),
    },
  }
}

const SNAP = 20
const NODE_GAP_X = 300
const NODE_PADDING = 28
const DEFAULT_NODE_WIDTH = 210
const DEFAULT_NODE_HEIGHT = 150

function snap(value: number) {
  return Math.round(value / SNAP) * SNAP
}

function getNewNodePosition(
  sourceId: string | null,
  targetId: string | null = null,
): PluginBlueprintPosition {
  const sourceNode = sourceId ? store.activeBlueprint?.canvas.nodes[sourceId] : null
  const targetNode = targetId ? store.activeBlueprint?.canvas.nodes[targetId] : null

  if (sourceNode && targetNode) {
    const gap = targetNode.position.x - sourceNode.position.x
    const x = gap >= NODE_GAP_X * 2
      ? sourceNode.position.x + Math.round(gap / 2)
      : sourceNode.position.x + NODE_GAP_X
    return resolveNodePositionOverlap({ x: snap(x), y: snap(sourceNode.position.y) }, [
      sourceNode.id,
      targetNode.id,
    ])
  }

  if (sourceNode) {
    return resolveNodePositionOverlap(
      { x: snap(sourceNode.position.x + NODE_GAP_X), y: snap(sourceNode.position.y) },
      [sourceNode.id],
    )
  }

  const center = canvasRef.value?.centerPosition() ?? { x: 260, y: 260 }
  const nodeCount = Object.keys(store.activeBlueprint?.canvas.nodes ?? {}).length
  return resolveNodePositionOverlap({
    x: snap(center.x - 80 + (nodeCount % 3) * 32),
    y: snap(center.y + 20 + Math.floor(nodeCount % 3) * 32),
  })
}

function resolveNodePositionOverlap(
  position: PluginBlueprintPosition,
  ignoreIds: string[] = [],
): PluginBlueprintPosition {
  const blueprint = store.activeBlueprint
  if (!blueprint) return position

  const ignored = new Set(ignoreIds)
  let candidate = { x: snap(position.x), y: snap(position.y) }
  let attempts = 0

  while (attempts < 24) {
    const overlappingNode = Object.values(blueprint.canvas.nodes).find((node) => {
      if (ignored.has(node.id)) return false
      return rectsOverlap(candidate, node.position)
    })

    if (!overlappingNode) return candidate

    const pushRight = overlappingNode.position.x + DEFAULT_NODE_WIDTH + NODE_PADDING
    candidate = {
      x: snap(Math.max(candidate.x, pushRight)),
      y: candidate.y,
    }
    attempts += 1
  }

  return candidate
}

function rectsOverlap(a: PluginBlueprintPosition, b: PluginBlueprintPosition) {
  return (
    a.x < b.x + DEFAULT_NODE_WIDTH + NODE_PADDING &&
    a.x + DEFAULT_NODE_WIDTH + NODE_PADDING > b.x &&
    a.y < b.y + DEFAULT_NODE_HEIGHT + NODE_PADDING &&
    a.y + DEFAULT_NODE_HEIGHT + NODE_PADDING > b.y
  )
}

function prepareSpaceForNode(position: PluginBlueprintPosition, ignoreIds: string[] = []) {
  const blueprint = store.activeBlueprint
  if (!blueprint) return

  const ignored = new Set(ignoreIds)
  const hasCollision = Object.values(blueprint.canvas.nodes).some((node) => {
    if (ignored.has(node.id)) return false
    return rectsOverlap(position, node.position)
  })

  if (hasCollision) {
    shiftNodesRightOf(position.x - NODE_PADDING, NODE_GAP_X, ignoreIds)
  }
}

function shiftNodesRightOf(anchorX: number, amount: number, ignoreIds: string[] = []) {
  const blueprint = store.activeBlueprint
  if (!blueprint || amount <= 0) return

  const ignored = new Set(ignoreIds)
  for (const node of Object.values(blueprint.canvas.nodes)) {
    if (ignored.has(node.id) || node.position.x < anchorX) continue
    store.updateNode(node.id, {
      position: {
        x: snap(node.position.x + amount),
        y: snap(node.position.y),
      },
    })
  }
}

function insertNodeBetween(payload: {
  edgeId: string
  newNodeId: string
  sourceId: string
  targetId: string
  sourceHandle?: string | null
  targetHandle?: string | null
}) {
  const sourceNode = store.activeBlueprint?.canvas.nodes[payload.sourceId]
  const targetNode = store.activeBlueprint?.canvas.nodes[payload.targetId]
  if (!sourceNode || !targetNode) return

  const currentGap = targetNode.position.x - sourceNode.position.x
  if (currentGap < NODE_GAP_X * 2) {
    shiftNodesRightOf(targetNode.position.x - 1, NODE_GAP_X, [payload.newNodeId, payload.sourceId])
  }

  const refreshedTarget = store.activeBlueprint?.canvas.nodes[payload.targetId] ?? targetNode
  const targetGap = refreshedTarget.position.x - sourceNode.position.x
  const nextPosition = resolveNodePositionOverlap(
    {
      x: snap(sourceNode.position.x + Math.min(NODE_GAP_X, Math.max(NODE_GAP_X, targetGap / 2))),
      y: snap(sourceNode.position.y),
    },
    [payload.sourceId, payload.targetId, payload.newNodeId],
  )

  store.updateNode(payload.newNodeId, { position: nextPosition })
  store.removeEdges([payload.edgeId])
  addPluginCreatorEdge({
    source: payload.sourceId,
    target: payload.newNodeId,
    sourceHandle: payload.sourceHandle ?? undefined,
  })
  addPluginCreatorEdge({
    source: payload.newNodeId,
    target: payload.targetId,
    targetHandle: payload.targetHandle ?? undefined,
  })
}

function clearQuickAddState() {
  quickAddSourceId.value = null
  quickAddSourceHandle.value = null
  pendingInsertEdgeId.value = null
  pendingInsertSourceId.value = null
  pendingInsertTargetId.value = null
  pendingInsertTargetHandle.value = null
}

function nodeLabel(type: PluginCreatorAddItemType) {
  const labels: Record<PluginCreatorAddItemType, string> = {
    method: 'Untitled Method',
    request: 'HTTP Request',
    responseMapper: 'Response mapping',
    errorMapper: 'Error mapping',
    codeBlock: 'Code Block',
    if: 'If',
    switch: 'Switch',
    tryCatch: 'Try/Catch',
    jsonTransform: 'JSON Transform',
    return: 'Return',
    for: 'For',
    forEach: 'ForEach',
    output: 'Output',
  }
  return labels[type]
}

function defaultNodeData(type: PluginCreatorAddItemType): Record<string, unknown> {
  const defaults: Partial<Record<PluginCreatorAddItemType, Record<string, unknown>>> = {
    if: { condition: 'Boolean(previous)' },
    switch: { expression: 'status', cases: [] },
    tryCatch: { errorVariable: 'error' },
    jsonTransform: { expression: 'previous', outputName: 'transformed' },
    return: { valueExpression: 'previous' },
    for: { itemVariable: 'index', fromExpression: '0', toExpression: '0' },
    forEach: { itemVariable: 'item', arrayExpression: 'previous' },
  }
  return defaults[type] ?? {}
}

async function runSelectedMethod() {
  openWorkspaceModal('test')
  const methodId =
    selectedNodeId.value && store.activeBlueprint?.canvas.nodes[selectedNodeId.value]?.data.methodId
  const fallbackMethodId = store.activeBlueprint?.methods[0]?.id
  const selectedMethodId = typeof methodId === 'string' ? methodId : fallbackMethodId
  if (!selectedMethodId) return

  await runMethodTestAndApplyTrace({
    methodId: selectedMethodId,
    params: {},
    credentials: {},
  })
}

async function runMethodTestAndApplyTrace(payload: PluginCreatorTestMethodPayload) {
  const result = await store.runMethodTest(payload)
  if (result?.trace) {
    executionStore.applyTrace(result.trace)
  }
  return result
}

async function saveDraft() {
  if (store.isNewBlueprint) {
    isCreatePluginFirstSave.value = true
    isCreatePluginModalOpen.value = true
    return
  }
  await store.saveDraft()
}

async function publishActiveBlueprint() {
  await saveDraft()
  await store.generatePreview()
  await store.publishActiveBlueprint()
  openWorkspaceModal('versions')
}

async function rollbackToReleaseSnapshot(snapshotId: string) {
  const ok = await confirm({
    title: 'Rollback plugin',
    message: 'Rollback this plugin to the selected snapshot? Current unsaved changes will be replaced.',
    confirmText: 'Rollback',
    cancelText: 'Cancel',
    variant: 'warning',
  })
  if (!ok) return
  await store.rollbackToSnapshot(snapshotId)
  await store.loadVersions()
  selectDefaultNode()
  fitCanvasSoon()
}

function clearExecution() {
  store.lastTestResult = null
  executionStore.clearExecution()
}

function fitCanvasSoon() {
  void nextTick(() => {
    window.setTimeout(() => canvasRef.value?.fitView(), 40)
  })
}

async function confirmUnsavedChanges() {
  if (!store.isDirty) return true
  const ok = await confirm({
    title: 'Unsaved changes',
    message: 'This plugin has unsaved changes. Discard them and continue?',
    confirmText: 'Discard changes',
    cancelText: 'Stay here',
    variant: 'warning',
  })
  return ok === true
}

async function confirmDiscardDraft() {
  const ok = await confirm({
    title: 'Discard draft changes',
    message: 'Discard all unsaved plugin changes and reload the last saved draft?',
    confirmText: 'Discard changes',
    cancelText: 'Cancel',
    variant: 'warning',
  })
  return ok === true
}
</script>

<style scoped>
.plugin-creator-page {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  background: var(--sailor-bg-base);
  color: var(--sailor-text-primary);
  overflow: hidden;
}

.plugin-creator-page__workspace {
  min-width: 0;
  min-height: 0;
  flex: 1;
  display: flex;
}

.plugin-creator-page__canvas-shell {
  position: relative;
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.plugin-creator-page__status {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 25;
  max-width: min(420px, calc(100% - 28px));
  padding: 8px 10px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-secondary);
  font-size: 12px;
  font-weight: 650;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
}

.plugin-creator-page__status--error {
  border-color: rgba(248, 113, 113, 0.4);
  background: rgba(127, 29, 29, 0.26);
  color: #fecaca;
}
</style>
