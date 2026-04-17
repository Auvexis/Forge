<script setup lang="ts">
import { workflowsApi } from '@/core/api/workflows.api'
import {
  useWorkflowActions,
  useWorkflowStore,
  Nod8WorkflowCanvas,
} from '@/features/workflow-editor'
import AppDock from '@/shared/components/layout/AppDock.vue'
import AppPage from '@/shared/components/layout/AppPage.vue'
import { useApi } from '@/shared/composables/useApi'
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { WorkflowItem } from '@/core/types/workflow.types'

const route = useRoute()
const workflowId = route.params.id as string

// Stores
const workflowStore = useWorkflowStore()

// Composables
const { closeWorkflow } = useWorkflowActions()

let workflow: WorkflowItem | null = null
const { data: workflows, execute: fetchWorkflow } = useApi(workflowsApi.getAll)

onMounted(async () => {
  if (!workflowId) {
    closeWorkflow()
    return
  }

  await fetchWorkflow()

  if (!workflows.value) return

  workflow = workflows.value.find((w) => w.metadata.id === workflowId) ?? null

  if (!workflow) {
    closeWorkflow()
    return
  }

  useWorkflowStore().setActiveWorkflow(workflow)
})

watch(
  () => workflowStore.activeWorkflow,
  (newWorkflow, oldWorkflow) => {
    // Ignora quando estamos carregando o fluxo pela primeira vez (saindo de null para o objeto)
    if (oldWorkflow === null) return

    // Se houve alguma alteração profunda (mutação) mas a reatividade aponta para
    // o mesmo objeto na memória, significa que o usuário mexeu no fluxo atual!
    if (newWorkflow === oldWorkflow) {
      workflowStore.isDirty = true
    }
  },
  { deep: true }, // O deep: true é obrigatório para o Vue notar mudanças dentro de nós ou propriedades
)
</script>

<template>
  <AppPage>
    <template #dock>
      <AppDock></AppDock>
    </template>

    <div class="nod8-fill flex-center">
      <Nod8WorkflowCanvas v-if="workflowStore.activeWorkflow" />
    </div>
  </AppPage>
</template>
