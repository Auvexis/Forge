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
          <PluginCreatorCodePreviewMinimap :blueprint="store.activeBlueprint" />
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
const isNodeSettingsModalOpen = ref(false)
const workspaceModalView = ref<PluginCreatorWorkspaceView>('metadata')
const quickAddSourceId = ref<string | null>(null)

const quickAddBus = useEventBus<{ sourceId: string; sourceHandle?: string }>('node:quick-add')
quickAddBus.on((payload) => {
  openAddBlocksPanel(payload?.sourceId ?? null)
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

  const blueprint = await store.createBlueprint({
    handle: 'my-api',
    name: 'My API',
    description: 'Low-code API plugin',
    includeDefaultMethod: false,
  })
  await router.replace({ name: 'plugin-creator-detail', params: { pluginId: blueprint.id } })
  void store.loadVersions()
  selectDefaultNode()
  fitCanvasSoon()
  return blueprint
}

async function createNewPlugin() {
  if (!confirmUnsavedChanges()) return
  isCreatePluginModalOpen.value = true
}

async function createPluginFromModal(payload: CreatePluginBlueprintPayload) {
  isCreatePluginModalOpen.value = false
  const blueprint = await store.createBlueprint(payload)
  await router.replace({ name: 'plugin-creator-detail', params: { pluginId: blueprint.id } })
  void store.loadVersions()
  selectDefaultNode()
  fitCanvasSoon()
}

async function openPluginBlueprint(blueprintId: string) {
  if (blueprintId === store.activeBlueprint?.id || !confirmUnsavedChanges()) return

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
  if (!window.confirm('Discard unsaved plugin changes?')) return

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

function openNodeSettingsModal(nodeId: string) {
  selectedNodeId.value = nodeId
  isNodeSettingsModalOpen.value = true
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
  store.addEdge({
    id: `edge_${payload.source}_${payload.target}_${Date.now()}`,
    ...payload,
  })
  if (quickAddSourceId.value === payload.source) {
    quickAddSourceId.value = null
    if (appPanelStore.panelId === 'plugin-creator-add-blocks') {
      appPanelStore.closePanel()
    }
  }
}

function addPluginCreatorBlock(type: PluginCreatorAddItemType) {
  const node = createNode(type)
  store.addNode(node)
  if (type === 'method') {
    addMethodFromNode(node)
  }
  if (type === 'codeBlock' && methodIdFromNode(node)) {
    upsertNodeCodeBlock(node)
  }
  if (quickAddSourceId.value) {
    connectNodes({ source: quickAddSourceId.value, target: node.id })
    quickAddSourceId.value = null
  }
  selectedNodeId.value = node.id
  fitCanvasSoon()
}

function duplicateNode(nodeId: string) {
  const existing = store.activeBlueprint?.canvas.nodes[nodeId]
  if (!existing) return
  const id = `${existing.type}_${Date.now()}`
  store.addNode({
    ...existing,
    id,
    position: {
      x: existing.position.x + 40,
      y: existing.position.y + 40,
    },
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
  const sourceNode =
    quickAddSourceId.value && store.activeBlueprint?.canvas.nodes[quickAddSourceId.value]
  const center = canvasRef.value?.centerPosition() ?? { x: 260, y: 220 }
  const position = sourceNode
    ? {
        x: sourceNode.position.x + 240,
        y: sourceNode.position.y,
      }
    : {
        x: Math.round(center.x - 80 + (nodeCount % 3) * 28),
        y: Math.round(center.y - 48 + Math.floor(nodeCount % 3) * 28),
      }

  return {
    id,
    type: type as PluginBlueprintNodeType,
    position,
    data: {
      label: nodeLabel(type),
      name: nodeLabel(type),
      methodId: nodeMethodId,
    },
  }
}

function nodeLabel(type: PluginCreatorAddItemType) {
  const labels: Record<PluginCreatorAddItemType, string> = {
    method: 'Untitled Method',
    request: 'HTTP Request',
    responseMapper: 'Response mapping',
    errorMapper: 'Error mapping',
    codeBlock: 'Code Block',
    output: 'Output',
  }
  return labels[type]
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
  await store.saveDraft()
}

async function publishActiveBlueprint() {
  await saveDraft()
  await store.generatePreview()
  await store.publishActiveBlueprint()
  openWorkspaceModal('versions')
}

async function rollbackToReleaseSnapshot(snapshotId: string) {
  if (!window.confirm('Rollback this plugin to the selected snapshot?')) return
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

function confirmUnsavedChanges() {
  return !store.isDirty || window.confirm('Discard unsaved plugin changes?')
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
