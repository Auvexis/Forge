<script setup lang="ts">
import { workflowsApi, type WorkflowGitSnapshotStatus } from '@/core/api/workflows.api'
import {
  useWorkflowActions,
  useWorkflowStore,
  useExecutionStore,
  SailorWorkflowCanvas,
} from '@/features/workflow-editor'
import WorkflowEditorChrome from '@/features/workflow-editor/components/ui/chrome/WorkflowEditorChrome.vue'
import WorkflowGitChangesWindow from '@/features/workflow-editor/components/ui/WorkflowGitChangesWindow.vue'
import WorkflowSettingsPanel from '@/features/workflow-editor/components/ui/WorkflowSettingsPanel.vue'
import WorkflowVariablesModal from '@/features/workflow-editor/components/ui/WorkflowVariablesModal.vue'
import ExecutionBottomPanel from '@/features/workflow-editor/components/execution/ExecutionBottomPanel.vue'
import AppPage from '@/shared/components/layout/AppPage.vue'
import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import { useAgentPanelUiStore } from '@/features/agent-panel/stores/agentPanelUi.store'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import { useApi } from '@/shared/composables/useApi'
import { useConfirm } from '@/shared/composables/useConfirm'
import { useToast } from '@/shared/composables/useToast'
import { useCommandPaletteStore } from '@/features/command-palette/stores/commandPalette.store'
import { PROFILE_SWITCH_REFRESH_EVENT } from '@/features/profiles/profileSwitchRefresh'
import { computed, onMounted, onBeforeUnmount, watch, ref, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { WorkflowItem } from '@/core/types/workflow.types'
import { listWorkflowChatTriggers } from '@/features/workflow-editor/utils/workflowRunTrigger'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const route = useRoute()
const router = useRouter()
const workflowId = route.params.id as string

// Stores
const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()
const commandPaletteStore = useCommandPaletteStore()
const appPanelStore = useAppPanelStore()
const agentPanelUi = useAgentPanelUiStore()
const agentPanelStore = useAgentPanelStore()

// Composables
const { closeWorkflow, exportWorkflow } = useWorkflowActions()
const { confirm } = useConfirm()
const toast = useToast()

// ── Close with dirty-check guard ──────────────────────────────────────────
async function handleClose() {
  if (!workflowStore.isDirty) {
    closeWorkflow()
    return
  }

  const result = await confirm({
    title: 'Unsaved changes',
    message: 'This workflow has unsaved changes. Do you want to save before leaving?',
    confirmText: 'Save & Close',
    cancelText: 'Discard & Close',
    variant: 'warning',
  })

  // null = dismissed via X / backdrop → stay on page, do nothing
  if (result === null) return

  if (result) {
    await workflowStore.saveActiveWorkflow()
  }

  closeWorkflow()
}

// ── Canvas ref — used to call exposed actions (run, stop, add-node) ───────
const canvasRef = ref<InstanceType<typeof SailorWorkflowCanvas> | null>(null)

// ── Logs panel state (shared between dock and canvas) ─────────────────────
const showSettings = ref(false)
const showVariables = ref(false)
const selectedChatTriggerNodeId = ref('')
const gitStatus = ref<WorkflowGitSnapshotStatus | null>(null)
const isGitStatusLoading = ref(false)
const isGitChangesWindowOpen = ref(false)
const hasExecutionState = computed(() => Object.keys(executionStore.nodeStatuses).length > 0)
const activeChatTriggers = computed(() => {
  const workflow = workflowStore.activeWorkflow
  return workflow ? listWorkflowChatTriggers(workflow) : []
})
const selectedChatTriggerEntry = computed(() => {
  const selected = activeChatTriggers.value.find((trigger) => trigger.triggerNodeId === selectedChatTriggerNodeId.value)
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
const canOpenDevChat = computed(() => activeDevSessionStatus.value === 'running' && !!activeWorkflowId.value)
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
const isDevChatOpen = computed(() => agentPanelUi.isOpen && agentPanelStore.agentScope === 'dev-session')
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
    useWorkflowStore().recoverDraft(newWorkflow.metadata.id)
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
  useWorkflowStore().recoverDraft(workflow.metadata.id)
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

  await workflowStore.saveActiveWorkflow()
  await loadWorkflowGitStatus()
  toast.success('Git snapshot updated')
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

async function handleRestoreGitSnapshot(hash: string) {
  const active = workflowStore.activeWorkflow
  if (!active) return

  const confirmed = await confirm({
    title: 'Restore snapshot',
    message: 'This will replace the current workflow with the selected snapshot. Continue?',
    confirmText: 'Restore',
    cancelText: 'Cancel',
    variant: 'warning',
  })
  if (!confirmed) return

  const restored = await workflowsApi.restoreGitSnapshot(active.metadata.id, hash)
  workflowStore.setActiveWorkflow(restored)
  await loadWorkflowGitStatus(restored.metadata.id)
  toast.success('Workflow snapshot restored')
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

function toggleGitChangesWindow() {
  isGitChangesWindowOpen.value = !isGitChangesWindowOpen.value
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
    if (nextTriggers.some((trigger) => trigger.triggerNodeId === selectedChatTriggerNodeId.value)) return
    selectedChatTriggerNodeId.value = nextTriggers[0]?.triggerNodeId ?? ''
  },
  { immediate: true },
)

onMounted(() => {
  initWorkflow()
  window.addEventListener('sailor:command-palette:intent', handleUiIntent)
  window.addEventListener(PROFILE_SWITCH_REFRESH_EVENT, initWorkflow)
})

// Limpa o store ao sair da página para que o canvas arranque sem dados obsoletos
onBeforeUnmount(() => {
  workflowStore.clearWorkflow()
  window.removeEventListener('sailor:command-palette:intent', handleUiIntent)
  window.removeEventListener(PROFILE_SWITCH_REFRESH_EVENT, initWorkflow)
})

watch(() => route.params.id, () => {
  initWorkflow()
})

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
  await workflowStore.saveActiveWorkflow()
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
  toast.success(isPublished ? 'Workflow unpublished' : 'Workflow published')
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
    <template #dock>
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
        @add-node="canvasRef?.openAddNodePanel()"
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

    <div class="sailor-fill flex-center">
      <SailorWorkflowCanvas
        v-if="workflowStore.activeWorkflow"
        ref="canvasRef"
      />
    </div>

    <div class="workflow-status-bar" role="toolbar" aria-label="Workflow panels">
      <button
        class="workflow-status-bar__button"
        :class="{ 'workflow-status-bar__button--active': isDevChatOpen }"
        type="button"
        :disabled="!canOpenDevChat"
        @click="toggleChatPanel"
      >
        <span class="workflow-status-bar__dot" :class="{ 'is-active': canOpenDevChat }" />
        <span>Chat</span>
        <code>{{ canOpenDevChat ? (selectedChatSlug || 'dev session') : 'dev session only' }}</code>
      </button>

      <button
        class="workflow-status-bar__button"
        :class="{ 'workflow-status-bar__button--active': isExecutionPanelOpen }"
        type="button"
        @click="toggleExecutionPanel"
      >
        <span class="workflow-status-bar__dot" :class="{ 'is-active': executionStore.hasActiveExecution }" />
        <span>Execution</span>
        <code>{{ executionStore.timeline.length }} events</code>
      </button>

      <button
        class="workflow-status-bar__button workflow-status-bar__button--git"
        :class="{ 'workflow-status-bar__button--active': gitStatus?.state === 'ready' }"
        type="button"
        :title="gitStatusTitle"
        @click="loadWorkflowGitStatus()"
      >
        <LucideIcon name="git-branch" :size="13" />
        <span>Git</span>
        <code>{{ gitStatusLabel }}</code>
      </button>

      <button
        class="workflow-status-bar__button workflow-status-bar__button--changes"
        :class="{ 'workflow-status-bar__button--active': isGitChangesWindowOpen }"
        type="button"
        @click="toggleGitChangesWindow"
      >
        <LucideIcon name="git-compare-arrows" :size="13" />
        <span>Changes</span>
        <code>workflow.json</code>
      </button>
    </div>

    <WorkflowGitChangesWindow
      v-if="isGitChangesWindowOpen && workflowStore.activeWorkflow"
      :workflow="workflowStore.activeWorkflow"
      @restore="handleRestoreGitSnapshot"
    />

    <WorkflowSettingsPanel :is-open="showSettings" @close="showSettings = false" />
    <WorkflowVariablesModal :is-open="showVariables" @close="showVariables = false" />
  </AppPage>
</template>

<style scoped>
.workflow-status-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--sailor-z-raised);
  display: flex;
  align-items: center;
  gap: 1px;
  height: 24px;
  padding: 0;
  border-top: 1px solid var(--sailor-border);
  background: var(--sailor-bg-base);
  color: var(--sailor-text-muted);
  font-size: 11px;
}

.workflow-status-bar__button {
  display: inline-flex;
  align-items: center;
  gap: var(--sailor-space-2);
  height: 100%;
  min-width: 140px;
  padding: 0 var(--sailor-space-3);
  border: 0;
  border-right: 1px solid var(--sailor-border-muted);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.workflow-status-bar__button:hover,
.workflow-status-bar__button--active {
  color: var(--sailor-text-primary);
  background: var(--sailor-bg-surface);
}

.workflow-status-bar__button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.workflow-status-bar__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--sailor-text-muted);
}

.workflow-status-bar__dot.is-active {
  background: var(--sailor-green-400);
}

.workflow-status-bar__button code {
  margin-left: auto;
  overflow: hidden;
  font-family: var(--sailor-font-mono);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
