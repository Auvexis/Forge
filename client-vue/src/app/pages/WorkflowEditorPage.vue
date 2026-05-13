<script setup lang="ts">
import { workflowsApi } from '@/core/api/workflows.api'
import {
  useWorkflowActions,
  useWorkflowStore,
  useExecutionStore,
  Nod8WorkflowCanvas,
} from '@/features/workflow-editor'
import WorkflowEditorChrome from '@/features/workflow-editor/components/ui/chrome/WorkflowEditorChrome.vue'
import WorkflowSettingsPanel from '@/features/workflow-editor/components/ui/WorkflowSettingsPanel.vue'
import WorkflowVariablesModal from '@/features/workflow-editor/components/ui/WorkflowVariablesModal.vue'
import AppPage from '@/shared/components/layout/AppPage.vue'
import { useApi } from '@/shared/composables/useApi'
import { useConfirm } from '@/shared/composables/useConfirm'
import { useToast } from '@/shared/composables/useToast'
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { WorkflowItem } from '@/core/types/workflow.types'

const route = useRoute()
const router = useRouter()
const workflowId = route.params.id as string

// Stores
const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()

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
const canvasRef = ref<InstanceType<typeof Nod8WorkflowCanvas> | null>(null)

// ── Logs panel state (shared between dock and canvas) ─────────────────────
const showLogs = ref(false)
const showSettings = ref(false)
const showVariables = ref(false)

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
}

function handleUiIntent(e: Event) {
  const intent = (e as CustomEvent).detail
  if (intent?.type === 'workflow-settings.open') showSettings.value = true
  if (intent?.type === 'workflow-variables.open') showVariables.value = true
  if (intent?.type === 'workflow-logs.open') showLogs.value = true
}

onMounted(() => {
  initWorkflow()
  window.addEventListener('nod8:command-palette:intent', handleUiIntent)
})

// Limpa o store ao sair da página para que o canvas arranque sem dados obsoletos
onBeforeUnmount(() => {
  workflowStore.clearWorkflow()
  window.removeEventListener('nod8:command-palette:intent', handleUiIntent)
})

watch(() => route.params.id, () => {
  initWorkflow()
})

watch(
  () => route.query.panel,
  (panel) => {
    if (panel === 'logs') {
      showLogs.value = true
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
  const updated = isPublished
    ? await workflowsApi.unpublish(active.metadata.id)
    : await workflowsApi.publish(active.metadata.id)

  workflowStore.setActiveWorkflow(updated)
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
        :is-logs-open="showLogs"
        :is-dirty="workflowStore.isDirty"
        :autosave-status="workflowStore.autosaveStatus"
        :last-autosaved-at="workflowStore.lastAutosavedAt"
        :is-autosave-enabled="workflowStore.isAutosaveEnabled"
        :can-undo="workflowStore.canUndo"
        :can-redo="workflowStore.canRedo"
        @save="handleSaveWorkflow()"
        @toggle-autosave="workflowStore.setAutosaveEnabled($event)"
        @undo="workflowStore.undo()"
        @redo="workflowStore.redo()"
        @add-node="canvasRef?.openAddNodePanel()"
        @run="canvasRef?.handleRun()"
        @stop="canvasRef?.handleStop()"
        @export-workflow="exportWorkflow()"
        @import-workflow="handleImportWorkflow()"
        @create-workflow="handleCreateWorkflow()"
        @toggle-logs="showLogs = !showLogs"
        @variables="showVariables = !showVariables"
        @settings="showSettings = !showSettings"
        @close="handleClose()"
        @workflow-updated="workflowStore.setActiveWorkflow($event)"
        @zoom-in="canvasRef?.zoomIn()"
        @zoom-out="canvasRef?.zoomOut()"
        @zoom-reset="canvasRef?.zoomReset()"
        @fit-view="canvasRef?.fitWorkflowView()"
        @publish="handlePublishWorkflow()"
      />
    </template>

    <div class="nod8-fill flex-center">
      <Nod8WorkflowCanvas
        v-if="workflowStore.activeWorkflow"
        ref="canvasRef"
        :show-logs="showLogs"
        @update:show-logs="showLogs = $event"
      />
    </div>

    <WorkflowSettingsPanel :is-open="showSettings" @close="showSettings = false" />
    <WorkflowVariablesModal :is-open="showVariables" @close="showVariables = false" />
  </AppPage>
</template>
