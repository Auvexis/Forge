<script setup lang="ts">
import { workflowsApi, type WorkflowGitSnapshotStatus } from '@/core/api/workflows.api'
import {
  useWorkflowActions,
  useWorkflowStore,
  useExecutionStore,
  FabricWorkflowCanvas,
} from '@/features/workflow-editor'
import WorkflowEditorChrome from '@/features/workflow-editor/components/ui/chrome/WorkflowEditorChrome.vue'
import GlobalAddNodePanel from '@/features/workflow-editor/components/settings/GlobalAddNodePanel.vue'
import WorkflowGitModal from '@/features/workflow-editor/components/ui/WorkflowGitModal.vue'
import WorkflowSettingsPanel from '@/features/workflow-editor/components/ui/WorkflowSettingsPanel.vue'
import WorkflowWorkbenchBottomPanel, {
  type WorkflowBottomPanelView,
} from '@/features/workflow-editor/components/ui/WorkflowWorkbenchBottomPanel.vue'
import AppPage from '@/shared/components/layout/AppPage.vue'
import AppPanel from '@/shared/components/layout/AppPanel.vue'
import GlobalAppPanel from '@/shared/components/layout/GlobalAppPanel.vue'
import AppWorkbench from '@/shared/components/workbench/AppWorkbench.vue'
import WorkbenchStatusBar from '@/shared/components/workbench/WorkbenchStatusBar.vue'
import BaseRail from '@/shared/components/base/BaseRail.vue'
import BaseRailItem from '@/shared/components/base/BaseRailItem.vue'
import BaseRailButtonToggleItem from '@/shared/components/base/BaseRailButtonToggleItem.vue'
import { useAppPanelStore, type AppPanelConfig } from '@/shared/stores/app-panel.store'
import { useApi } from '@/shared/composables/useApi'
import { useAuvexisProductEvents } from '@/shared/composables/useAuvexisProductEvents'
import { useConfirm } from '@/shared/composables/useConfirm'
import { useToast } from '@/shared/composables/useToast'
import { useCommandPaletteStore } from '@/features/command-palette/stores/commandPalette.store'
import { useNodeInspectorStore } from '@/features/workflow-editor/stores/node-inspector.store'
import { PROFILE_SWITCH_REFRESH_EVENT } from '@/features/profiles/profileSwitchRefresh'
import { computed, onMounted, onBeforeUnmount, watch, ref, markRaw } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import type { WorkflowItem, WorkflowNodeType } from '@/core/types/workflow.types'
import { listWorkflowChatTriggers } from '@/features/workflow-editor/utils/workflowRunTrigger'
import {
  consumeWorkflowReloadDiscard,
  discardWorkflowDraft,
  markWorkflowReloadDiscard,
} from '@/features/workflow-editor/utils/workflowDraftLifecycle'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const route = useRoute()
const router = useRouter()
const workflowId = route.params.id as string

// Stores
const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()
const commandPaletteStore = useCommandPaletteStore()
const appPanelStore = useAppPanelStore()
const nodeInspectorStore = useNodeInspectorStore()

// Composables
const { closeWorkflow, exportWorkflow } = useWorkflowActions()
const { confirm } = useConfirm()
const toast = useToast()
const { triggerAuvexisEvent } = useAuvexisProductEvents()

async function confirmUnsavedWorkflowLeave() {
  if (!workflowStore.isDirty) return true
  const result = await confirm({
    title: 'Unsaved changes',
    message: 'This workflow has unsaved changes. Do you want to save before leaving?',
    confirmText: 'Save & Leave',
    cancelText: 'Discard & Leave',
    variant: 'warning',
  })

  if (result === null) return false
  if (result) return workflowStore.saveActiveWorkflow()
  const activeWorkflowId = workflowStore.activeWorkflow?.metadata.id
  if (activeWorkflowId) discardWorkflowDraft(localStorage, activeWorkflowId)
  return true
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!workflowStore.isDirty) return
  const activeWorkflowId = workflowStore.activeWorkflow?.metadata.id
  if (activeWorkflowId) {
    markWorkflowReloadDiscard(sessionStorage, activeWorkflowId)
  }
  event.preventDefault()
  event.returnValue = ''
}

function recoverWorkflowDraft(workflowId: string) {
  if (consumeWorkflowReloadDiscard(localStorage, sessionStorage)) return false
  return workflowStore.recoverDraft(workflowId)
}

function handleClose() {
  closeWorkflow()
}

// ── Canvas ref — used to call exposed actions (run, stop, add-node) ───────
const canvasRef = ref<InstanceType<typeof FabricWorkflowCanvas> | null>(null)
const focusedCanvasNodeId = ref<string | null>(null)

// ── Logs panel state (shared between dock and canvas) ─────────────────────
const showSettings = ref(false)
const selectedChatTriggerNodeId = ref('')
const gitStatus = ref<WorkflowGitSnapshotStatus | null>(null)
const isGitStatusLoading = ref(false)
const isGitModalOpen = ref(false)
const isGitCommitting = ref(false)
const gitModalRefreshKey = ref(0)
const showInspector = ref(false)
const isBottomPanelOpen = ref(false)
const activeBottomPanelView = ref<WorkflowBottomPanelView>('timeline')
const workflowInspectorWidth = ref(280)
const workflowSettingsWidth = ref(360)
const workflowGlobalPanelWidth = ref<number | null>(null)
const workflowBottomPanelHeight = ref(300)
const bottomPanelResizeStart = ref({ y: 0, height: 0 })
const globalSidePanelWidth = computed(() => {
  if (!appPanelStore.isOpen || appPanelStore.position !== 'right') return 0
  if (workflowGlobalPanelWidth.value !== null) return workflowGlobalPanelWidth.value
  if (appPanelStore.width === 'xl') return 600
  if (appPanelStore.width === 'lg') return 480
  return 360
})
const hasExecutionState = computed(() => Object.keys(executionStore.nodeStatuses).length > 0)
const isGlobalAddNodePanelOpen = computed(() =>
  appPanelStore.isOpen && appPanelStore.panelId === 'workflow-global-add-node-panel',
)
const isVariablesPanelOpen = computed(() =>
  isBottomPanelOpen.value && activeBottomPanelView.value === 'variables',
)
const activeChatTriggers = computed(() => {
  const workflow = workflowStore.activeWorkflow
  return workflow ? listWorkflowChatTriggers(workflow) : []
})
const selectedChatTriggerEntry = computed(() => {
  const selected = activeChatTriggers.value.find(
    (trigger) => trigger.triggerNodeId === selectedChatTriggerNodeId.value,
  )
  if (selected) {
    return { nodeId: selected.triggerNodeId, trigger: selected.trigger }
  }

  const firstChatTrigger = activeChatTriggers.value[0]
  if (firstChatTrigger) {
    return { nodeId: firstChatTrigger.triggerNodeId, trigger: firstChatTrigger.trigger }
  }

  const workflow = workflowStore.activeWorkflow
  const nodeTriggerEntry = Object.entries(workflowStore.activeWorkflow?.nodes ?? {})
    .map(([nodeId, node]) => ({ nodeId, trigger: (node as any).trigger }))
    .find((entry) => entry.trigger?.type === 'chat')

  if (nodeTriggerEntry) return nodeTriggerEntry
  return { nodeId: 'trigger', trigger: workflow?.trigger }
})
const activeChatTrigger = computed(() => selectedChatTriggerEntry.value.trigger)
const activeChatTriggerNodeId = computed(() => selectedChatTriggerEntry.value.nodeId)
const activeWorkflowId = computed(() => workflowStore.activeWorkflow?.metadata.id)
const activeDevSessionId = computed(() => executionStore.activeSessionId ?? undefined)
const activeDevSessionStatus = computed(() => executionStore.sessionStatus)
const canOpenDevChat = computed(
  () => activeDevSessionStatus.value === 'running' && !!activeWorkflowId.value,
)
const activeChatSlug = computed(() => {
  const trigger = activeChatTrigger.value as Record<string, unknown> | undefined
  if (trigger?.type !== 'chat') return ''
  return typeof trigger.chatSlug === 'string' ? trigger.chatSlug.trim() : ''
})
const selectedChatSlug = computed(() => activeChatSlug.value)
const activeChatTitle = computed(() => {
  const trigger = activeChatTrigger.value as Record<string, unknown> | undefined
  return typeof trigger?.chatTitle === 'string' ? trigger.chatTitle.trim() : ''
})
const workflowNodeCount = computed(() =>
  workflowStore.activeWorkflow ? Object.keys(workflowStore.activeWorkflow.nodes).length : 0,
)
const workflowEdgeCount = computed(() => workflowStore.activeWorkflow?.edges.length ?? 0)
const workflowTriggerType = computed(() => workflowStore.activeWorkflow?.trigger.type ?? 'manual')
const activeInspectorNode = computed(() => nodeInspectorStore.activeNode)
const activeInspectorNodeName = computed(() => {
  const data = activeInspectorNode.value?.data as Record<string, unknown> | undefined
  return typeof data?.name === 'string' && data.name.trim()
    ? data.name.trim()
    : (activeInspectorNode.value?.id ?? 'Node')
})
const activeInspectorNodeType = computed(() => activeInspectorNode.value?.type ?? 'workflow')
const activeInspectorNodeStatus = computed(() =>
  activeInspectorNode.value?.id
    ? executionStore.nodeStatuses[activeInspectorNode.value.id]?.status
    : null,
)
const activeInspectorNodeEdges = computed(() => {
  const nodeId = activeInspectorNode.value?.id
  if (!nodeId) return { incoming: 0, outgoing: 0 }
  const edges = workflowStore.activeWorkflow?.edges ?? []
  return {
    incoming: edges.filter((edge) => edge.target === nodeId).length,
    outgoing: edges.filter((edge) => edge.source === nodeId).length,
  }
})
const workflowRuntimeState = computed(() => {
  if (executionStore.isStreaming) return 'streaming'
  if (executionStore.isExecuting) return 'running'
  if (executionStore.workflowStatus) return executionStore.workflowStatus.toLowerCase()
  return 'idle'
})
const isDevChatOpen = computed(() => false)
const isExecutionPanelOpen = computed(
  () => isBottomPanelOpen.value && activeBottomPanelView.value === 'execution',
)
const workflowWorkbenchStyle = computed(() => ({
  '--workflow-inspector-width': showInspector.value ? `${workflowInspectorWidth.value}px` : '0px',
  '--workflow-side-panel-width': showSettings.value ? `${workflowSettingsWidth.value}px` : '0px',
  '--workflow-global-panel-width': `${globalSidePanelWidth.value}px`,
  '--workflow-bottom-panel-right': `${
    (showInspector.value ? workflowInspectorWidth.value : 0)
    + (showSettings.value ? workflowSettingsWidth.value : 0)
    + globalSidePanelWidth.value
  }px`,
  '--workflow-canvas-right': `${
    (showInspector.value ? workflowInspectorWidth.value : 0)
    + (showSettings.value ? workflowSettingsWidth.value : 0)
    + globalSidePanelWidth.value
  }px`,
  '--workflow-canvas-bottom': isBottomPanelOpen.value
    ? `${workflowBottomPanelHeight.value}px`
    : '0px',
}))
const gitStatusLabel = computed(() => {
  if (isGitStatusLoading.value) return 'loading'
  if (!gitStatus.value) return 'not loaded'
  if (gitStatus.value.state === 'ready') return gitStatus.value.latestCommit?.shortHash ?? 'synced'
  if (gitStatus.value.state === 'no-commits') return 'no commits'
  if (gitStatus.value.state === 'error') return 'error'
  return 'no snapshot'
})
const gitStatusTitle = computed(() => {
  if (!gitStatus.value) return 'Git snapshot status is not loaded yet'
  if (gitStatus.value.error) return gitStatus.value.error
  if (gitStatus.value.latestCommit) {
    return `${gitStatus.value.branch ?? 'HEAD'} ${gitStatus.value.latestCommit.shortHash}: ${gitStatus.value.latestCommit.message}`
  }
  return gitStatus.value.repoPath || 'Git snapshot repository not created yet'
})

let workflow: WorkflowItem | null = null
const { data: workflows, execute: fetchWorkflow } = useApi(workflowsApi.getAll)
const { execute: createWorkflowApi } = useApi(workflowsApi.create)

async function initWorkflow() {
  const currentId = route.params.id as string | undefined

  if (!currentId) {
    // In-memory workflow creation (no API call until saved)
    const newWorkflow: WorkflowItem = {
      metadata: {
        id: crypto.randomUUID(),
        name: 'New Workflow',
        version: '1',
        isActive: false,
        isDraft: true,
        public: false,
        autosaveEnabled: false,
        createdAt: new Date().toISOString(),
      },
      trigger: { type: 'manual' },
      nodes: {},
      edges: [],
    }
    useWorkflowStore().setActiveWorkflow(newWorkflow)
    recoverWorkflowDraft(newWorkflow.metadata.id)
    gitStatus.value = null
    return
  }

  await fetchWorkflow()

  if (!workflows.value) return

  workflow = workflows.value.find((w) => w.metadata.id === currentId) ?? null

  if (!workflow) {
    closeWorkflow()
    return
  }

  useWorkflowStore().setActiveWorkflow(workflow)
  recoverWorkflowDraft(workflow.metadata.id)
  await loadWorkflowGitStatus(workflow.metadata.id)
}

async function loadWorkflowGitStatus(targetWorkflowId = workflowStore.activeWorkflow?.metadata.id) {
  if (!targetWorkflowId) {
    gitStatus.value = null
    return
  }

  isGitStatusLoading.value = true
  try {
    gitStatus.value = await workflowsApi.getGitStatus(targetWorkflowId)
  } catch (error) {
    gitStatus.value = {
      available: false,
      state: 'error',
      repoPath: '',
      branch: null,
      latestCommit: null,
      error: error instanceof Error ? error.message : 'Failed to load git status',
    }
  } finally {
    isGitStatusLoading.value = false
  }
}

async function handleCreateGitSnapshot() {
  if (!workflowStore.activeWorkflow || !route.params.id) {
    toast.error('Save workflow before creating git snapshots')
    return
  }

  await handleCommitGitSnapshot(`Update ${workflowStore.activeWorkflow.metadata.name}`)
}

function openGitModal() {
  isGitModalOpen.value = true
  void loadWorkflowGitStatus()
}

async function handleCommitGitSnapshot(message: string) {
  const active = workflowStore.activeWorkflow
  if (!active || !route.params.id) {
    toast.error('Save workflow before committing')
    return
  }

  isGitCommitting.value = true
  try {
    await workflowStore.saveActiveWorkflow()
    const current = workflowStore.activeWorkflow
    if (!current) return

    const result = await workflowsApi.commitGitSnapshot(current.metadata.id, message)
    gitStatus.value = result.status
    gitModalRefreshKey.value += 1
    toast.success(result.committed ? 'Workflow committed' : 'No workflow changes to commit')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to commit workflow')
  } finally {
    isGitCommitting.value = false
  }
}

async function handleRestoreGitSnapshot(hash: string) {
  const active = workflowStore.activeWorkflow
  if (!active) return

  const confirmed = await confirm({
    title: 'Restore workflow version',
    message:
      'This will replace the current workflow with the selected committed version. Continue?',
    confirmText: 'Restore',
    cancelText: 'Cancel',
    variant: 'warning',
  })
  if (!confirmed) return

  try {
    const restored = await workflowsApi.restoreGitSnapshot(active.metadata.id, hash)
    workflowStore.setActiveWorkflow(restored)
    await loadWorkflowGitStatus(restored.metadata.id)
    gitModalRefreshKey.value += 1
    toast.success('Workflow version restored')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to restore workflow version')
  }
}

async function handleCopyGitRepoPath() {
  const repoPath = gitStatus.value?.repoPath
  if (!repoPath) {
    toast.error('Git repository is not available yet')
    return
  }

  await navigator.clipboard.writeText(repoPath)
  toast.success('Git repo path copied')
}

function handleUiIntent(e: Event) {
  const intent = (e as CustomEvent).detail
  if (intent?.type === 'workflow-settings.open') openWorkflowSettings()
  if (intent?.type === 'workflow-variables.open') openBottomPanel('variables')
  if (intent?.type === 'workflow-logs.open') openExecutionPanel()
  if (intent?.type === 'workflow-chat.open') openDevSessionChat(intent.triggerNodeId)
}

function openBottomPanel(view: WorkflowBottomPanelView) {
  activeBottomPanelView.value = view
  isBottomPanelOpen.value = true
}

function toggleBottomPanel(view: WorkflowBottomPanelView) {
  if (isBottomPanelOpen.value && activeBottomPanelView.value === view) {
    isBottomPanelOpen.value = false
    return
  }

  openBottomPanel(view)
}

function openExecutionPanel() {
  openBottomPanel('execution')
}

function openGlobalAddNodePanel(toggle = false) {
  showSettings.value = false
  showInspector.value = false
  const panel: AppPanelConfig = {
    id: 'workflow-global-add-node-panel',
    title: 'Add Node',
    component: markRaw(GlobalAddNodePanel),
    position: 'right',
    width: 'md',
    resizable: true,
    resizeSide: 'left',
    props: {
      onAddLogicNodeAtCenter: (type: WorkflowNodeType, defaults?: Record<string, unknown>) =>
        canvasRef.value?.addLogicNodeAtViewportCenter(type, defaults),
      onAddPluginNodeAtCenter: (pluginId: string, action: string, actionName: string) =>
        canvasRef.value?.addPluginNodeAtViewportCenter(pluginId, action, actionName),
      onAddLogicNodeAtPoint: (
        type: WorkflowNodeType,
        point: { x: number; y: number },
        defaults?: Record<string, unknown>,
      ) => canvasRef.value?.addLogicNodeAtScreenPoint(type, point, defaults),
      onAddPluginNodeAtPoint: (
        pluginId: string,
        action: string,
        actionName: string,
        point: { x: number; y: number },
      ) => canvasRef.value?.addPluginNodeAtScreenPoint(pluginId, action, actionName, point),
    },
  }
  if (toggle) appPanelStore.togglePanel(panel)
  else appPanelStore.openPanel(panel)
}

function handleWorkflowEditorShortcut(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey)) return
  const key = event.key.toLowerCase()
  if (key === 's') {
    event.preventDefault()
    if (!event.repeat) void handleSaveWorkflow()
    return
  }
  if (isEditableShortcutTarget(event.target)) return
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault()
    workflowStore.undo()
    return
  }
  if (key === 'y') {
    event.preventDefault()
    workflowStore.redo()
    return
  }
  if (key === 'b') {
    event.preventDefault()
    openGlobalAddNodePanel(true)
  }
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function openDevSessionChat(targetTriggerNodeId?: string) {
  if (targetTriggerNodeId) selectedChatTriggerNodeId.value = targetTriggerNodeId
  window.dispatchEvent(new CustomEvent('fabric:command-palette:intent', {
    detail: {
      type: 'agents.open',
      payload: selectedChatSlug.value ? { chatSlug: selectedChatSlug.value } : undefined,
    },
  }))
}

function toggleChatPanel() {
  openDevSessionChat()
}

function toggleExecutionPanel() {
  toggleBottomPanel('execution')
}

function selectTimelineNode(nodeId: string) {
  canvasRef.value?.selectNode(nodeId)
}

function focusTimelineNode(nodeId: string) {
  canvasRef.value?.focusNode(nodeId)
}

function highlightTimelineNode(nodeId: string | null) {
  canvasRef.value?.highlightNode(nodeId)
}

function clearTimelineNodeSelection() {
  canvasRef.value?.highlightNode(null)
  canvasRef.value?.clearSelection()
}

function handleCanvasSelectionFocus(nodeId: string | null) {
  focusedCanvasNodeId.value = nodeId
}

function handleInspectorPanelResize(size: { width: number | null }) {
  workflowInspectorWidth.value = size.width ?? 280
}

function handleSettingsPanelResize(size: { width: number | null }) {
  workflowSettingsWidth.value = size.width ?? 360
}

function handleGlobalPanelResize(size: { width: number | null }) {
  workflowGlobalPanelWidth.value = size.width
}

function handleGlobalPanelResizeReset() {
  workflowGlobalPanelWidth.value = null
}

function startBottomPanelResize(event: MouseEvent) {
  event.preventDefault()
  bottomPanelResizeStart.value = {
    y: event.clientY,
    height: workflowBottomPanelHeight.value,
  }
  window.addEventListener('mousemove', resizeBottomPanel)
  window.addEventListener('mouseup', stopBottomPanelResize, { once: true })
}

function resizeBottomPanel(event: MouseEvent) {
  const nextHeight = bottomPanelResizeStart.value.height + bottomPanelResizeStart.value.y - event.clientY
  workflowBottomPanelHeight.value = clampBottomPanelHeight(nextHeight)
}

function clampBottomPanelHeight(height: number) {
  const canvasHeight = canvasRef.value?.$el?.closest('.workflow-workbench__canvas')?.clientHeight
  const maxHeight = Math.max(180, (canvasHeight ?? window.innerHeight) - 120)
  return Math.min(maxHeight, Math.max(180, Math.round(height)))
}

function stopBottomPanelResize() {
  window.removeEventListener('mousemove', resizeBottomPanel)
}

function openWorkflowSettings() {
  closeGlobalSidePanel()
  showInspector.value = false
  showSettings.value = true
}

function closeGlobalSidePanel() {
  if (!appPanelStore.isOpen || appPanelStore.position === 'bottom') return
  appPanelStore.closePanel()
}

function toggleInspectorPanel() {
  if (showInspector.value) {
    showInspector.value = false
    return
  }
  closeGlobalSidePanel()
  showSettings.value = false
  showInspector.value = true
}

function openCommandPalette() {
  void commandPaletteStore.open({
    routePath: route.path,
    activeWorkflowId: workflowStore.activeWorkflow?.metadata.id,
    activeExecutionId: executionStore.activeExecutionId ?? undefined,
  })
}

watch(
  activeChatTriggers,
  (nextTriggers) => {
    if (nextTriggers.some((trigger) => trigger.triggerNodeId === selectedChatTriggerNodeId.value))
      return
    selectedChatTriggerNodeId.value = nextTriggers[0]?.triggerNodeId ?? ''
  },
  { immediate: true },
)

onMounted(() => {
  initWorkflow()
  window.addEventListener('keydown', handleWorkflowEditorShortcut)
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('fabric:command-palette:intent', handleUiIntent)
  window.addEventListener(PROFILE_SWITCH_REFRESH_EVENT, initWorkflow)
})

// Limpa o store ao sair da página para que o canvas arranque sem dados obsoletos
onBeforeUnmount(() => {
  workflowStore.clearWorkflow()
  window.removeEventListener('mousemove', resizeBottomPanel)
  window.removeEventListener('keydown', handleWorkflowEditorShortcut)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('fabric:command-palette:intent', handleUiIntent)
  window.removeEventListener(PROFILE_SWITCH_REFRESH_EVENT, initWorkflow)
})

onBeforeRouteLeave(async () => confirmUnsavedWorkflowLeave())

watch(
  () => route.params.id,
  () => {
    initWorkflow()
  },
)

watch(
  () => route.query.panel,
  (panel) => {
    if (panel === 'logs') {
      openExecutionPanel()
      void router.replace({ query: { ...route.query, panel: undefined } })
    } else if (panel === 'settings') {
      openWorkflowSettings()
      void router.replace({ query: { ...route.query, panel: undefined } })
    } else if (panel === 'variables') {
      openBottomPanel('variables')
      void router.replace({ query: { ...route.query, panel: undefined } })
    }
  },
  { immediate: true },
)

watch(showSettings, (isOpen) => {
  if (!isOpen) return
  closeGlobalSidePanel()
})

async function handleSaveWorkflow() {
  const saved = await workflowStore.saveActiveWorkflow()
  if (!saved) return
  await loadWorkflowGitStatus()
  // If we are on the root /workflows path (in-memory draft), update the URL to the new ID
  if (route.path === '/workflows' && workflowStore.activeWorkflow) {
    router.replace(`/workflows/${workflowStore.activeWorkflow.metadata.id}`)
  }
}

async function handleCreateWorkflow() {
  const newWorkflow: WorkflowItem = {
    metadata: {
      id: crypto.randomUUID(),
      name: 'New Workflow',
      version: '1',
      isActive: false,
      isDraft: true,
      public: false,
      autosaveEnabled: false,
      createdAt: new Date().toISOString(),
    },
    trigger: { type: 'manual' },
    nodes: {},
    edges: [],
  }

  const created = await createWorkflowApi(newWorkflow)
  workflowStore.setActiveWorkflow(created)
  await loadWorkflowGitStatus(created.metadata.id)
  router.replace(`/workflows/${created.metadata.id}`)
}

function handleImportWorkflow() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    const workflow = JSON.parse(await file.text()) as WorkflowItem
    workflow.metadata.id = crypto.randomUUID()
    workflow.metadata.createdAt = new Date().toISOString()
    workflow.metadata.isDraft = true
    const created = await createWorkflowApi(workflow)
    workflowStore.setActiveWorkflow(created)
    await loadWorkflowGitStatus(created.metadata.id)
    router.replace(`/workflows/${created.metadata.id}`)
  }
  input.click()
}

async function handlePublishWorkflow() {
  const active = workflowStore.activeWorkflow
  if (!active || !route.params.id) {
    toast.error('Save workflow before publishing')
    return
  }

  const isPublished = active.metadata.isActive && !active.metadata.isDraft
  if (!isPublished && workflowStore.isDirty) {
    await workflowStore.saveActiveWorkflow()
  }

  const workflowToPublish = workflowStore.activeWorkflow
  if (!workflowToPublish) {
    toast.error('Save workflow before publishing')
    return
  }

  const updated = isPublished
    ? await workflowsApi.unpublish(workflowToPublish.metadata.id)
    : await workflowsApi.publish(workflowToPublish.metadata.id)

  workflowStore.setActiveWorkflow(updated)
  await loadWorkflowGitStatus(updated.metadata.id)

  if (!isPublished) {
    await emitWorkflowPublishedEvent(updated.metadata.id)
  }

  toast.success(isPublished ? 'Workflow unpublished' : 'Workflow published')
}

async function emitWorkflowPublishedEvent(workflowId: string) {
  try {
    const result = await triggerAuvexisEvent({
      type: 'fabric.workflow.published',
      eventId: `fabric.workflow.published:${workflowId}`,
      evidence: { workflowId },
    })
    console.info('[Auvexis] Workflow published event accepted', result)
    showWorkflowPublishedEventFeedback(result.outcomes)
  } catch (error) {
    console.warn('[Auvexis] Workflow published event failed', error)
  }
}

function showWorkflowPublishedEventFeedback(
  outcomes: Array<{ outcome: string; reason: string | null }>,
) {
  if (outcomes.some((outcome) => outcome.outcome === 'claimed')) {
    toast.reward('Auvexis campaign reward claimed.', {
      title: 'Reward claimed',
      category: 'rewards',
      source: 'auvexis',
      context: { outcomes },
    })
    return
  }
  console.info('[Auvexis] Workflow published event had no reward claim', { outcomes })
}

watch(
  () => workflowStore.activeWorkflow,
  (newWorkflow, oldWorkflow) => {
    // If the workflow was cleared (deleted or closed) and we are on the base route, regenerate a draft
    if (!newWorkflow && !route.params.id) {
      initWorkflow()
      return
    }

    // Ignora quando estamos carregando o fluxo pela primeira vez (saindo de null para o objeto)
    if (oldWorkflow === null) return
  },
  { deep: true }, // O deep: true é obrigatório para o Vue notar mudanças dentro de nós ou propriedades
)
</script>

<template>
  <AppPage :show-global-panel="false">
    <AppWorkbench class="workflow-workbench" :style="workflowWorkbenchStyle">
      <WorkflowEditorChrome
        :workflow-name="workflowStore.activeWorkflow?.metadata.name ?? 'Workflow'"
        :workflow-id="workflowStore.activeWorkflow?.metadata.id ?? ''"
        :workflow="workflowStore.activeWorkflow ?? undefined"
        :is-saving="workflowStore.isSaving"
        :is-executing="executionStore.isExecuting"
        :is-streaming="executionStore.isStreaming"
        :is-logs-open="isExecutionPanelOpen"
        :is-dirty="workflowStore.isDirty"
        :autosave-status="workflowStore.autosaveStatus"
        :last-autosaved-at="workflowStore.lastAutosavedAt"
        :is-autosave-enabled="workflowStore.isAutosaveEnabled"
        :can-undo="workflowStore.canUndo"
        :can-redo="workflowStore.canRedo"
        :has-execution-state="hasExecutionState"
        :git-repo-path="gitStatus?.repoPath"
        @save="handleSaveWorkflow()"
        @toggle-autosave="workflowStore.setAutosaveEnabled($event)"
        @undo="workflowStore.undo()"
        @redo="workflowStore.redo()"
        @duplicate-selection="canvasRef?.duplicateSelection()"
        @delete-selection="canvasRef?.deleteSelection()"
        @select-all="canvasRef?.selectAllNodes()"
        @clear-selection="canvasRef?.clearSelection()"
        @add-node="openGlobalAddNodePanel()"
        @run="canvasRef?.handleRun()"
        @stop="canvasRef?.handleStop()"
        @clean-execution="executionStore.resetNodeStatuses()"
        @export-workflow="exportWorkflow()"
        @import-workflow="handleImportWorkflow()"
        @create-workflow="handleCreateWorkflow()"
        @toggle-logs="openExecutionPanel()"
        @variables="openBottomPanel('variables')"
        @settings="showSettings ? (showSettings = false) : openWorkflowSettings()"
        @close="handleClose()"
        @workflow-updated="workflowStore.setActiveWorkflow($event)"
        @zoom-in="canvasRef?.zoomIn()"
        @zoom-out="canvasRef?.zoomOut()"
        @zoom-reset="canvasRef?.zoomReset()"
        @fit-view="canvasRef?.fitWorkflowView()"
        @command-palette="openCommandPalette()"
        @publish="handlePublishWorkflow()"
        @git-create-snapshot="handleCreateGitSnapshot()"
        @git-refresh-status="loadWorkflowGitStatus()"
        @git-copy-repo-path="handleCopyGitRepoPath()"
      />

      <template #left>
        <BaseRail aria-label="Workflow editor tools">
          <section class="base-rail__group" aria-label="Edit">
            <BaseRailItem
              icon="undo-2"
              title="Undo"
              :disabled="!workflowStore.canUndo || executionStore.isExecuting || executionStore.isStreaming"
              @click="workflowStore.undo()"
            />
            <BaseRailItem
              icon="redo-2"
              title="Redo"
              :disabled="!workflowStore.canRedo || executionStore.isExecuting || executionStore.isStreaming"
              @click="workflowStore.redo()"
            />
          </section>

          <section class="base-rail__group" aria-label="Canvas">
            <BaseRailItem
              icon="zoom-out"
              title="Zoom out"
              @click="canvasRef?.zoomOut()"
            />
            <BaseRailItem
              icon="rotate-ccw"
              title="Reset zoom"
              @click="canvasRef?.zoomReset()"
            />
            <BaseRailItem
              icon="zoom-in"
              title="Zoom in"
              @click="canvasRef?.zoomIn()"
            />
            <BaseRailItem
              icon="maximize"
              title="Fit view"
              @click="canvasRef?.fitWorkflowView()"
            />
          </section>

          <section class="base-rail__group" aria-label="Build">
            <BaseRailItem
              icon="plus"
              :icon-size="19"
              tone="primary"
              :active="isGlobalAddNodePanelOpen"
              title="Add node"
              @click="openGlobalAddNodePanel(true)"
            />
            <BaseRailItem
              icon="tags"
              :active="isVariablesPanelOpen"
              title="Variables"
              @click="toggleBottomPanel('variables')"
            />
            <BaseRailItem
              icon="settings"
              :active="showSettings"
              title="Workflow settings"
              @click="showSettings ? (showSettings = false) : openWorkflowSettings()"
            />
            <BaseRailItem
              icon="test-tube-diagonal"
              :active="showInspector"
              title="Inspector"
              @click="toggleInspectorPanel"
            />
          </section>

          <section class="base-rail__group" aria-label="Execution">
            <BaseRailItem
              v-if="!executionStore.isStreaming"
              icon="play"
              tone="run"
              title="Run workflow"
              :disabled="executionStore.isExecuting"
              @click="canvasRef?.handleRun()"
            />
            <BaseRailItem
              v-else
              icon="square"
              tone="danger"
              title="Stop run"
              @click="canvasRef?.handleStop()"
            />
            <BaseRailItem
              icon="scroll-text"
              :active="isExecutionPanelOpen"
              title="Execution logs"
              @click="toggleExecutionPanel"
            />
            <BaseRailItem
              icon="eraser"
              title="Clean execution"
              :disabled="executionStore.isExecuting || executionStore.isStreaming || !hasExecutionState"
              @click="executionStore.resetNodeStatuses()"
            />
          </section>

          <section class="base-rail__group" aria-label="Save and publish">
            <BaseRailItem
              icon="save"
              :dirty="workflowStore.isDirty"
              title="Save workflow"
              :disabled="workflowStore.isSaving || !workflowStore.isDirty || executionStore.isExecuting || executionStore.isStreaming"
              @click="handleSaveWorkflow()"
            />
            <BaseRailItem
              :icon="workflowStore.activeWorkflow?.metadata.isActive && !workflowStore.activeWorkflow?.metadata.isDraft ? 'pause' : 'radio'"
              :title="workflowStore.activeWorkflow?.metadata.isActive && !workflowStore.activeWorkflow?.metadata.isDraft ? 'Unpublish workflow' : 'Publish workflow'"
              :disabled="workflowStore.isSaving || executionStore.isExecuting || executionStore.isStreaming || !route.params.id"
              @click="handlePublishWorkflow()"
            />
            <BaseRailButtonToggleItem
              :model-value="workflowStore.isAutosaveEnabled"
              :title="workflowStore.isAutosaveEnabled ? 'Autosave on' : 'Autosave off'"
              :disabled="executionStore.isExecuting || executionStore.isStreaming || workflowStore.isSaving"
              @update:model-value="workflowStore.setAutosaveEnabled($event)"
            />
          </section>

          <span class="base-rail__spacer" aria-hidden="true" />

          <section class="base-rail__group" aria-label="Utilities">
            <BaseRailItem
              icon="command"
              title="Command palette"
              @click="openCommandPalette"
            />
            <BaseRailItem
              icon="git-commit-horizontal"
              title="Create git snapshot"
              :disabled="!route.params.id"
              @click="handleCreateGitSnapshot()"
            />
            <BaseRailItem
              icon="git-branch"
              title="Git snapshot details"
              @click="openGitModal"
            />
          </section>
        </BaseRail>
      </template>

      <div class="workflow-workbench__canvas">
        <div class="workflow-workbench__canvas-viewport">
          <FabricWorkflowCanvas
            v-if="workflowStore.activeWorkflow"
            ref="canvasRef"
            @selection-focus="handleCanvasSelectionFocus"
          />
        </div>

        <AppPanel
          class="workflow-inspector-panel"
          :is-open="showInspector"
          title="Inspector"
          position="right"
          width="md"
          resizable
          resize-side="left"
          @close="showInspector = false"
          @resize="handleInspectorPanelResize"
          @resize-reset="handleInspectorPanelResize({ width: null })"
        >
          <div class="workflow-inspector-panel__body" aria-label="Workflow inspector">
            <section class="workflow-inspector-panel__section">
              <span class="workflow-inspector-panel__section-title">Context</span>
              <dl class="workflow-property-grid">
                <div>
                  <dt>Name</dt>
                  <dd>{{ workflowStore.activeWorkflow?.metadata.name ?? 'Workflow' }}</dd>
                </div>
                <div>
                  <dt>Mode</dt>
                  <dd>{{ workflowStore.activeWorkflow?.metadata.isDraft ? 'Draft' : 'Saved' }}</dd>
                </div>
                <div>
                  <dt>Trigger</dt>
                  <dd>{{ workflowTriggerType }}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>v{{ workflowStore.activeWorkflow?.metadata.version ?? '1' }}</dd>
                </div>
              </dl>
            </section>

            <section class="workflow-inspector-panel__section">
              <span class="workflow-inspector-panel__section-title">Graph</span>
              <div class="workflow-meter-grid">
                <button type="button" @click="openGlobalAddNodePanel()">
                  <strong>{{ workflowNodeCount }}</strong>
                  <span>Nodes</span>
                </button>
                <button type="button" @click="canvasRef?.fitWorkflowView()">
                  <strong>{{ workflowEdgeCount }}</strong>
                  <span>Edges</span>
                </button>
                <button type="button" @click="toggleExecutionPanel">
                  <strong>{{ executionStore.timeline.length }}</strong>
                  <span>Events</span>
                </button>
              </div>
            </section>

            <section class="workflow-inspector-panel__section">
              <span class="workflow-inspector-panel__section-title">
                {{ activeInspectorNode ? 'Selected Node' : 'Selection' }}
              </span>
              <div v-if="activeInspectorNode" class="workflow-selected-node">
                <span class="workflow-selected-node__icon">
                  <LucideIcon name="box" :size="15" />
                </span>
                <div>
                  <strong>{{ activeInspectorNodeName }}</strong>
                  <small>{{ activeInspectorNodeType }}</small>
                </div>
                <code>{{ activeInspectorNodeStatus ?? 'idle' }}</code>
              </div>
              <div v-else class="workflow-inspector-panel__empty">
                <LucideIcon name="mouse-pointer-2" :size="16" />
                <span>Select or double-click a node to inspect details.</span>
              </div>
            </section>

            <section v-if="activeInspectorNode" class="workflow-inspector-panel__section">
              <span class="workflow-inspector-panel__section-title">Routing</span>
              <dl class="workflow-property-grid">
                <div>
                  <dt>Node ID</dt>
                  <dd>{{ activeInspectorNode.id }}</dd>
                </div>
                <div>
                  <dt>Inputs</dt>
                  <dd>{{ activeInspectorNodeEdges.incoming }}</dd>
                </div>
                <div>
                  <dt>Outputs</dt>
                  <dd>{{ activeInspectorNodeEdges.outgoing }}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{{ activeInspectorNodeStatus ?? 'idle' }}</dd>
                </div>
              </dl>
            </section>

            <section class="workflow-inspector-panel__section">
              <span class="workflow-inspector-panel__section-title">Runtime</span>
              <dl class="workflow-property-grid">
                <div>
                  <dt>State</dt>
                  <dd>{{ workflowRuntimeState }}</dd>
                </div>
                <div>
                  <dt>Session</dt>
                  <dd>{{ executionStore.activeSessionId ?? 'none' }}</dd>
                </div>
                <div>
                  <dt>Timeline</dt>
                  <dd>{{ executionStore.timeline.length }} events</dd>
                </div>
                <div>
                  <dt>Git</dt>
                  <dd>{{ gitStatusLabel }}</dd>
                </div>
              </dl>
            </section>
          </div>
        </AppPanel>

        <section
          v-if="isBottomPanelOpen"
          class="workflow-workbench__bottom-panel"
          :style="{ height: `${workflowBottomPanelHeight}px` }"
        >
          <div
            class="workflow-workbench__bottom-panel-resize"
            role="separator"
            aria-orientation="horizontal"
            title="Resize bottom panel"
            @mousedown="startBottomPanelResize"
          />
          <WorkflowWorkbenchBottomPanel
            v-model:active-view="activeBottomPanelView"
            :focused-node-id="focusedCanvasNodeId"
            @close="isBottomPanelOpen = false"
            @node-select="selectTimelineNode"
            @node-focus="focusTimelineNode"
            @node-hover="highlightTimelineNode"
            @node-clear="clearTimelineNodeSelection"
          />
        </section>

        <GlobalAppPanel
          @resize="handleGlobalPanelResize"
          @resize-reset="handleGlobalPanelResizeReset"
        />
        <WorkflowSettingsPanel
          :is-open="showSettings"
          @close="showSettings = false"
          @resize="handleSettingsPanelResize"
          @resize-reset="handleSettingsPanelResize({ width: null })"
        />
      </div>

      <template #status>
        <WorkbenchStatusBar aria-label="Workflow workbench status">
          <template #left>
            <button
              class="workflow-status-bar__button"
              :class="{ 'workflow-status-bar__button--active': isDevChatOpen }"
              type="button"
              @click="toggleChatPanel"
            >
              <span class="workflow-status-bar__dot" :class="{ 'is-active': canOpenDevChat }" />
              <span>Chat</span>
              <code>{{
                selectedChatSlug || 'published agents'
              }}</code>
            </button>

            <button
              class="workflow-status-bar__button"
              :class="{
                'workflow-status-bar__button--active':
                  isBottomPanelOpen && activeBottomPanelView === 'timeline',
              }"
              type="button"
              @click="toggleBottomPanel('timeline')"
            >
              <LucideIcon name="chart-no-axes-gantt" :size="13" />
              <span>Timeline</span>
              <code>{{ executionStore.timeline.length }} events</code>
            </button>

            <button
              class="workflow-status-bar__button"
              :class="{
                'workflow-status-bar__button--active':
                  isBottomPanelOpen && activeBottomPanelView === 'variables',
              }"
              type="button"
              @click="toggleBottomPanel('variables')"
            >
              <LucideIcon name="tags" :size="13" />
              <span>Variables</span>
              <code>{{ workflowStore.activeWorkflow?.variables?.length ?? 0 }} local</code>
            </button>

            <button
              class="workflow-status-bar__button"
              :class="{ 'workflow-status-bar__button--active': isExecutionPanelOpen }"
              type="button"
              @click="toggleExecutionPanel"
            >
              <span
                class="workflow-status-bar__dot"
                :class="{ 'is-active': executionStore.hasActiveExecution }"
              />
              <span>Execution</span>
              <code>{{ executionStore.timeline.length }} events</code>
            </button>
          </template>

          <template #right>
            <button
              class="workflow-status-bar__button workflow-status-bar__button--git"
              type="button"
              :title="gitStatusTitle"
              @click="openGitModal"
            >
              <LucideIcon name="git-branch" :size="13" />
              <span>Git</span>
              <code>{{ gitStatusLabel }}</code>
            </button>
          </template>
        </WorkbenchStatusBar>
      </template>
    </AppWorkbench>

    <WorkflowGitModal
      v-if="workflowStore.activeWorkflow"
      :is-open="isGitModalOpen"
      :workflow="workflowStore.activeWorkflow"
      :git-status="gitStatus"
      :is-committing="isGitCommitting"
      :refresh-key="gitModalRefreshKey"
      @close="isGitModalOpen = false"
      @commit="handleCommitGitSnapshot"
      @restore="handleRestoreGitSnapshot"
    />
  </AppPage>
</template>

<style scoped>
.workflow-workbench {
  --fabric-workbench-status-height: 24px;
  --workflow-inspector-width: 280px;
  --workflow-side-panel-width: 0px;
  --workflow-global-panel-width: 0px;
  --workflow-bottom-panel-right: var(--workflow-inspector-width);
  --workflow-canvas-right: var(--workflow-inspector-width);
  --workflow-canvas-bottom: 0px;
}

.workflow-workbench__canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.workflow-workbench__canvas-viewport {
  position: absolute;
  inset: 0 var(--workflow-canvas-right) var(--workflow-canvas-bottom) 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.workflow-workbench__bottom-panel {
  position: absolute;
  right: var(--workflow-bottom-panel-right);
  bottom: 0;
  left: 0;
  z-index: var(--fabric-z-raised);
  min-height: 180px;
  max-height: calc(100% - 120px);
  overflow: hidden;
  border-top: 1px solid var(--fabric-workflow-editor-page-workbench-border);
  background: var(--fabric-workflow-editor-page-workbench-panel-bg);
}

.workflow-workbench__bottom-panel-resize {
  position: absolute;
  top: -3px;
  right: 0;
  left: 0;
  z-index: 2;
  height: 6px;
  cursor: ns-resize;
}

.workflow-workbench__bottom-panel-resize:hover {
  background: color-mix(in srgb, var(--fabric-workflow-editor-page-accent) 28%, transparent);
}

.workflow-workbench__canvas :deep(.app-panel--right:not(.workflow-inspector-panel)) {
  right: var(--workflow-inspector-width);
}

.workflow-workbench__canvas :deep(.app-panel--bottom) {
  right: var(--workflow-bottom-panel-right);
}

.workflow-inspector-panel {
  --app-panel-resized-width: var(--workflow-inspector-width);
}

.workflow-inspector-panel :deep(.app-panel__header) {
  height: 38px;
  padding: 0 8px 0 10px;
}

.workflow-inspector-panel :deep(.app-panel__title) {
  font-size: 12px;
  font-weight: 650;
}

.workflow-inspector-panel :deep(.app-panel__body) {
  overflow: hidden;
}

.workflow-inspector-panel__body {
  display: flex;
  min-width: 0;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--fabric-workflow-editor-page-workbench-panel-bg);
  color: var(--fabric-workflow-editor-page-text-primary);
  font-size: 12px;
}

.workflow-inspector-panel__section-title {
  color: var(--fabric-workflow-editor-page-text-muted);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-transform: uppercase;
}

.workflow-inspector-panel__section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid var(--fabric-workflow-editor-page-workbench-border);
}

.workflow-property-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  margin: 0;
}

.workflow-property-grid div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  min-height: 24px;
}

.workflow-property-grid dt {
  color: var(--fabric-workflow-editor-page-text-muted);
  font-size: 11px;
}

.workflow-property-grid dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--fabric-workflow-editor-page-text-primary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-meter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  border: 1px solid var(--fabric-workflow-editor-page-border-muted);
  background: var(--fabric-workflow-editor-page-border-muted);
}

.workflow-meter-grid button {
  display: flex;
  min-width: 0;
  min-height: 46px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  padding: 0 8px;
  border: 0;
  background: var(--fabric-workflow-editor-page-workbench-panel-bg);
  color: var(--fabric-workflow-editor-page-text-primary);
  cursor: pointer;
}

.workflow-meter-grid button:hover {
  background: var(--fabric-workflow-editor-page-button-ghost-hover);
}

.workflow-meter-grid strong {
  font-size: 15px;
  line-height: 1;
}

.workflow-meter-grid span {
  color: var(--fabric-workflow-editor-page-text-muted);
  font-size: 10px;
}

.workflow-selected-node {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 42px;
}

.workflow-selected-node__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--fabric-workflow-editor-page-border-muted);
  border-radius: 4px;
  background: var(--fabric-workflow-editor-page-bg-elevated);
  color: var(--fabric-workflow-editor-page-text-muted);
}

.workflow-selected-node div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.workflow-selected-node strong,
.workflow-selected-node small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-selected-node strong {
  font-size: 12px;
  line-height: 1.3;
}

.workflow-selected-node small,
.workflow-selected-node code {
  color: var(--fabric-workflow-editor-page-text-muted);
  font-size: 10px;
}

.workflow-inspector-panel__empty {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  color: var(--fabric-workflow-editor-page-text-muted);
  font-size: 11px;
  line-height: 1.35;
}

.workflow-status-bar__button {
  display: inline-flex;
  align-items: center;
  gap: var(--fabric-space-2);
  height: 100%;
  min-width: 0;
  padding: 0 var(--fabric-space-3);
  border: 0;
  border-right: 1px solid var(--fabric-workflow-editor-page-border-muted);
  background: var(--fabric-workflow-editor-page-workbench-status-button-bg);
  color: inherit;
  cursor: pointer;
}

.workflow-status-bar__button:hover,
.workflow-status-bar__button--active {
  color: var(--fabric-workflow-editor-page-text-primary);
  background: var(--fabric-workflow-editor-page-workbench-status-button-hover-bg);
}

.workflow-status-bar__button--active {
  background: var(--fabric-workflow-editor-page-workbench-status-button-active-bg);
}

.workflow-status-bar__button--git {
  border-left: 1px solid var(--fabric-workflow-editor-page-border-muted);
}

.workflow-status-bar__button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.workflow-status-bar__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--fabric-workflow-editor-page-text-muted);
}

.workflow-status-bar__dot.is-active {
  background: var(--fabric-workflow-editor-page-green400);
}

.workflow-status-bar__button code {
  margin-left: auto;
  overflow: hidden;
  font-family: var(--fabric-font-mono);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
