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
import WorkflowVariablesModal from '@/features/workflow-editor/components/ui/WorkflowVariablesModal.vue'
import ExecutionBottomPanel from '@/features/workflow-editor/components/execution/ExecutionBottomPanel.vue'
import AppPage from '@/shared/components/layout/AppPage.vue'
import AppWorkbench from '@/shared/components/workbench/AppWorkbench.vue'
import WorkbenchStatusBar from '@/shared/components/workbench/WorkbenchStatusBar.vue'
import { useAppPanelStore, type AppPanelConfig } from '@/shared/stores/app-panel.store'
import { useAgentPanelUiStore } from '@/features/agent-panel/stores/agentPanelUi.store'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
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
const agentPanelUi = useAgentPanelUiStore()
const agentPanelStore = useAgentPanelStore()

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

// ── Logs panel state (shared between dock and canvas) ─────────────────────
const showSettings = ref(false)
const showVariables = ref(false)
const selectedChatTriggerNodeId = ref('')
const gitStatus = ref<WorkflowGitSnapshotStatus | null>(null)
const isGitStatusLoading = ref(false)
const isGitModalOpen = ref(false)
const isGitCommitting = ref(false)
const gitModalRefreshKey = ref(0)
const hasExecutionState = computed(() => Object.keys(executionStore.nodeStatuses).length > 0)
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
const isDevChatOpen = computed(
  () => agentPanelUi.isOpen && agentPanelStore.agentScope === 'dev-session',
)
const isExecutionPanelOpen = computed(
  () => appPanelStore.isOpen && appPanelStore.panelId === 'workflow-execution-bottom-panel',
)
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
  if (intent?.type === 'workflow-settings.open') showSettings.value = true
  if (intent?.type === 'workflow-variables.open') showVariables.value = true
  if (intent?.type === 'workflow-logs.open') openExecutionPanel()
  if (intent?.type === 'workflow-chat.open') openDevSessionChat(intent.triggerNodeId)
}

function openExecutionPanel() {
  appPanelStore.openPanel({
    id: 'workflow-execution-bottom-panel',
    title: 'Execution',
    component: markRaw(ExecutionBottomPanel),
    position: 'bottom',
    width: 'xl',
    resizable: true,
    resizeSide: 'top',
  })
}

function openGlobalAddNodePanel(toggle = false) {
  const panel: AppPanelConfig = {
    id: 'workflow-global-add-node-panel',
    title: 'Add Node',
    component: markRaw(GlobalAddNodePanel),
    position: 'right',
    width: 'md',
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
  if (!canOpenDevChat.value || !activeWorkflowId.value) return
  agentPanelStore.prepareDevSession({
    scope: 'dev-session',
    workflowId: activeWorkflowId.value,
    triggerNodeId: activeChatTriggerNodeId.value,
  })
  agentPanelUi.open()
}

function toggleChatPanel() {
  if (!canOpenDevChat.value) return
  if (isDevChatOpen.value) {
    agentPanelUi.close()
    return
  }

  openDevSessionChat()
}

function toggleExecutionPanel() {
  if (isExecutionPanelOpen.value) {
    appPanelStore.closePanel()
    return
  }

  openExecutionPanel()
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
      showSettings.value = true
      void router.replace({ query: { ...route.query, panel: undefined } })
    } else if (panel === 'variables') {
      showVariables.value = true
      void router.replace({ query: { ...route.query, panel: undefined } })
    }
  },
  { immediate: true },
)

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
  <AppPage>
    <AppWorkbench class="workflow-workbench">
      <template #toolstrip>
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
          @variables="showVariables = !showVariables"
          @settings="showSettings = !showSettings"
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
      </template>

      <template #left>
        <nav class="workflow-tool-rail" aria-label="Workflow tools">
          <button
            class="workflow-tool-rail__button workflow-tool-rail__button--primary"
            type="button"
            title="Add node"
            @click="openGlobalAddNodePanel()"
          >
            <LucideIcon name="plus" :size="16" />
          </button>

          <span class="workflow-tool-rail__divider" aria-hidden="true" />

          <button
            v-if="!executionStore.isStreaming"
            class="workflow-tool-rail__button workflow-tool-rail__button--run"
            type="button"
            title="Run workflow"
            :disabled="executionStore.isExecuting"
            @click="canvasRef?.handleRun()"
          >
            <LucideIcon name="play" :size="16" />
          </button>
          <button
            v-else
            class="workflow-tool-rail__button workflow-tool-rail__button--danger"
            type="button"
            title="Stop run"
            @click="canvasRef?.handleStop()"
          >
            <LucideIcon name="square" :size="15" />
          </button>

          <button
            class="workflow-tool-rail__button"
            :class="{ 'workflow-tool-rail__button--active': isExecutionPanelOpen }"
            type="button"
            title="Execution logs"
            @click="toggleExecutionPanel"
          >
            <LucideIcon name="scroll-text" :size="16" />
          </button>

          <button
            class="workflow-tool-rail__button"
            type="button"
            title="Workflow variables"
            @click="showVariables = true"
          >
            <LucideIcon name="tags" :size="16" />
          </button>

          <button
            class="workflow-tool-rail__button"
            type="button"
            title="Workflow settings"
            @click="showSettings = true"
          >
            <LucideIcon name="settings" :size="16" />
          </button>

          <span class="workflow-tool-rail__spacer" />

          <button
            class="workflow-tool-rail__button"
            type="button"
            title="Command palette"
            @click="openCommandPalette"
          >
            <LucideIcon name="command" :size="16" />
          </button>

          <button
            class="workflow-tool-rail__button"
            :class="{ 'workflow-tool-rail__button--active': gitStatus?.state === 'ready' }"
            type="button"
            title="Git snapshots"
            @click="openGitModal"
          >
            <LucideIcon name="git-branch" :size="16" />
          </button>
        </nav>
      </template>

      <div class="workflow-workbench__canvas">
        <FabricWorkflowCanvas v-if="workflowStore.activeWorkflow" ref="canvasRef" />
      </div>

      <template #inspector>
        <aside class="workflow-inspector-panel" aria-label="Workflow inspector">
          <header class="workflow-inspector-panel__header">
            <div>
              <span class="workflow-inspector-panel__eyebrow">Inspector</span>
              <strong>{{ activeInspectorNode ? 'Node Properties' : 'Workflow Overview' }}</strong>
            </div>
            <button
              class="workflow-inspector-panel__icon-button"
              type="button"
              title="Open workflow settings"
              @click="showSettings = true"
            >
              <LucideIcon name="panel-right" :size="15" />
            </button>
          </header>

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

          <section
            class="workflow-inspector-panel__section workflow-inspector-panel__section--actions"
          >
            <button type="button" @click="showVariables = true">
              <LucideIcon name="tags" :size="14" />
              Variables
            </button>
            <button type="button" @click="openExecutionPanel()">
              <LucideIcon name="scroll-text" :size="14" />
              Logs
            </button>
          </section>
        </aside>
      </template>

      <template #status>
        <WorkbenchStatusBar aria-label="Workflow workbench status">
          <template #left>
            <button
              class="workflow-status-bar__button"
              :class="{ 'workflow-status-bar__button--active': isDevChatOpen }"
              type="button"
              :disabled="!canOpenDevChat"
              @click="toggleChatPanel"
            >
              <span class="workflow-status-bar__dot" :class="{ 'is-active': canOpenDevChat }" />
              <span>Chat</span>
              <code>{{
                canOpenDevChat ? selectedChatSlug || 'dev session' : 'dev session only'
              }}</code>
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
              :class="{ 'workflow-status-bar__button--active': gitStatus?.state === 'ready' }"
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

    <WorkflowSettingsPanel :is-open="showSettings" @close="showSettings = false" />
    <WorkflowVariablesModal :is-open="showVariables" @close="showVariables = false" />
  </AppPage>
</template>

<style scoped>
.workflow-workbench {
  --fabric-workbench-status-height: 24px;
}

.workflow-workbench__canvas {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.workflow-tool-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 42px;
  height: 100%;
  padding: 6px 4px;
  background: var(--fabric-workbench-rail-bg);
}

.workflow-tool-rail__button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--fabric-text-muted);
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.workflow-tool-rail__button:hover:not(:disabled),
.workflow-tool-rail__button--active {
  border-color: var(--fabric-border-muted);
  background: var(--fabric-button-ghost-hover);
  color: var(--fabric-text-primary);
}

.workflow-tool-rail__button--active::before {
  position: absolute;
  left: -4px;
  width: 2px;
  height: 18px;
  border-radius: 999px;
  background: var(--fabric-accent);
  content: '';
}

.workflow-tool-rail__button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.workflow-tool-rail__button--primary {
  color: var(--fabric-accent);
}

.workflow-tool-rail__button--run {
  color: var(--fabric-green-500);
}

.workflow-tool-rail__button--danger {
  color: var(--fabric-red-500);
}

.workflow-tool-rail__divider {
  width: 22px;
  height: 1px;
  margin: 3px 0;
  background: var(--fabric-border-muted);
}

.workflow-tool-rail__spacer {
  flex: 1;
}

.workflow-inspector-panel {
  display: flex;
  flex-direction: column;
  width: 248px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--fabric-workbench-panel-bg);
  color: var(--fabric-text-primary);
  font-size: 12px;
}

.workflow-inspector-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  padding: 0 10px;
  border-bottom: 1px solid var(--fabric-workbench-border);
  background: var(--fabric-workbench-rail-bg);
}

.workflow-inspector-panel__header > div,
.workflow-inspector-panel__section {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.workflow-inspector-panel__header strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-inspector-panel__eyebrow,
.workflow-inspector-panel__section-title {
  color: var(--fabric-text-muted);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-transform: uppercase;
}

.workflow-inspector-panel__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--fabric-text-muted);
  cursor: pointer;
}

.workflow-inspector-panel__icon-button:hover {
  border-color: var(--fabric-border-muted);
  background: var(--fabric-button-ghost-hover);
  color: var(--fabric-text-primary);
}

.workflow-inspector-panel__section {
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid var(--fabric-workbench-border);
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
  color: var(--fabric-text-muted);
  font-size: 11px;
}

.workflow-property-grid dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--fabric-text-primary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-meter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  border: 1px solid var(--fabric-border-muted);
  background: var(--fabric-border-muted);
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
  background: var(--fabric-workbench-panel-bg);
  color: var(--fabric-text-primary);
  cursor: pointer;
}

.workflow-meter-grid button:hover {
  background: var(--fabric-button-ghost-hover);
}

.workflow-meter-grid strong {
  font-size: 15px;
  line-height: 1;
}

.workflow-meter-grid span {
  color: var(--fabric-text-muted);
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
  border: 1px solid var(--fabric-border-muted);
  border-radius: 4px;
  background: var(--fabric-bg-elevated);
  color: var(--fabric-text-muted);
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
  color: var(--fabric-text-muted);
  font-size: 10px;
}

.workflow-inspector-panel__empty {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  color: var(--fabric-text-muted);
  font-size: 11px;
  line-height: 1.35;
}

.workflow-inspector-panel__section--actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin-top: auto;
  padding: 0;
  border-top: 1px solid var(--fabric-workbench-border);
  border-bottom: 0;
  background: var(--fabric-border-muted);
}

.workflow-inspector-panel__section--actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  border: 0;
  background: var(--fabric-workbench-panel-bg);
  color: var(--fabric-text-muted);
  font-size: 11px;
  cursor: pointer;
}

.workflow-inspector-panel__section--actions button:hover {
  background: var(--fabric-button-ghost-hover);
  color: var(--fabric-text-primary);
}

.workflow-status-bar__button {
  display: inline-flex;
  align-items: center;
  gap: var(--fabric-space-2);
  height: 100%;
  min-width: 140px;
  padding: 0 var(--fabric-space-3);
  border: 0;
  border-right: 1px solid var(--fabric-border-muted);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.workflow-status-bar__button:hover,
.workflow-status-bar__button--active {
  color: var(--fabric-text-primary);
  background: var(--fabric-bg-surface);
}

.workflow-status-bar__button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.workflow-status-bar__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--fabric-text-muted);
}

.workflow-status-bar__dot.is-active {
  background: var(--fabric-green-400);
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
