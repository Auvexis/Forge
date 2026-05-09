<script setup lang="ts">
import { workflowsApi } from '@/core/api/workflows.api'
import {
  useWorkflowActions,
  useWorkflowStore,
  useExecutionStore,
  Nod8WorkflowCanvas,
} from '@/features/workflow-editor'
import WorkflowEditorDock from '@/features/workflow-editor/components/ui/WorkflowEditorDock.vue'
import WorkflowSettingsPanel from '@/features/workflow-editor/components/ui/WorkflowSettingsPanel.vue'
import AppPage from '@/shared/components/layout/AppPage.vue'
import { useApi } from '@/shared/composables/useApi'
import { useConfirm } from '@/shared/composables/useConfirm'
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

let workflow: WorkflowItem | null = null
const { data: workflows, execute: fetchWorkflow } = useApi(workflowsApi.getAll)

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
        createdAt: new Date().toISOString(),
      },
      trigger: { type: 'manual' },
      nodes: {},
      edges: [],
    }
    useWorkflowStore().setActiveWorkflow(newWorkflow)
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
}

onMounted(() => {
  initWorkflow()
})

// Limpa o store ao sair da página para que o canvas arranque sem dados obsoletos
onBeforeUnmount(() => {
  workflowStore.clearWorkflow()
})

watch(() => route.params.id, () => {
  initWorkflow()
})

async function handleSaveWorkflow() {
  await workflowStore.saveActiveWorkflow()
  // If we are on the root /workflows path (in-memory draft), update the URL to the new ID
  if (route.path === '/workflows' && workflowStore.activeWorkflow) {
    router.replace(`/workflows/${workflowStore.activeWorkflow.metadata.id}`)
  }
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
      <WorkflowEditorDock
        :workflow-name="workflowStore.activeWorkflow?.metadata.name ?? 'Workflow'"
        :workflow-id="workflowStore.activeWorkflow?.metadata.id ?? ''"
        :workflow="workflowStore.activeWorkflow ?? undefined"
        :is-saving="workflowStore.isSaving"
        :is-executing="executionStore.isExecuting"
        :is-streaming="executionStore.isStreaming"
        :is-logs-open="showLogs"
        :is-dirty="workflowStore.isDirty"
        @save="handleSaveWorkflow()"
        @add-node="canvasRef?.openAddNodePanel()"
        @run="canvasRef?.handleRun()"
        @stop="canvasRef?.handleStop()"
        @export-workflow="exportWorkflow()"
        @toggle-logs="showLogs = !showLogs"
        @settings="showSettings = !showSettings"
        @close="handleClose()"
        @workflow-updated="workflowStore.setActiveWorkflow($event)"
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
  </AppPage>
</template>
