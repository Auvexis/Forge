<script setup lang="ts">
import { useWorkflowActions, useWorkflowStore } from '@/features/workflow-editor'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import AppPage from '@/shared/components/layout/AppPage.vue'
import AppDock from '@/shared/components/layout/AppDock.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownDivider from '@/shared/components/overlay/Dropdown/AppDropdownDivider.vue'
import { useApi } from '@/shared/composables/useApi'
import { workflowsApi } from '@/core/api/workflows.api'
import { onMounted, watch } from 'vue'

const workflowStore = useWorkflowStore()
const { openWorkflow } = useWorkflowActions()

// Utilizamos o composable para rastrear automático do state (loading, error, data)
const { data: workflowsList, execute: fetchWorkflows } = useApi(workflowsApi.getAll, [])

onMounted(() => {
  fetchWorkflows().catch(console.error)
})

watch(
  () => workflowStore.activeWorkflow,
  (workflow) => {
    if (workflow) {
      openWorkflow(workflow)
    }
  },
  { immediate: true },
)
</script>

<template>
  <AppPage>
    <!-- Dock local, nativo e robusto desta página! Não sofre com desmontagem de rotas -->
    <template #dock>
      <AppDock>
        <template #left>
          <AppDropdownMenu position="bottom-start">
            <template #trigger>
              <button class="gap-2 flex-center text-secondary">
                <LucideIcon name="chevrons-down-up" :size="15" />
                <span class="text-sm">Workflows</span>
              </button>
            </template>

            <AppDropdownItem icon="cloud-upload" label="Import from JSON" />
            <AppDropdownItem icon="plus-circle" label="Create Workflow" />

            <template v-if="workflowsList && workflowsList.length > 0">
              <AppDropdownDivider />

              <template v-for="workflow in workflowsList" :key="workflow.metadata.id">
                <AppDropdownItem
                  icon="workflow"
                  :label="workflow.metadata.name"
                  @click="openWorkflow(workflow)"
                >
                  <template #element>
                    <div class="dropdown-item-container">
                      <span
                        class="text-xs text-muted font-mono tracking-tight"
                        :style="{
                          'max-width': '50%',
                          'text-overflow': 'ellipsis',
                          overflow: 'hidden',
                        }"
                      >
                        {{ workflow.metadata.id }}
                      </span>

                      <span class="text-xs text-muted font-mono tracking-tight">
                        {{
                          (() => {
                            const nodes = Object.keys(workflow.nodes).length
                            return nodes == 1 ? `${nodes} Node` : `${nodes} Nodes`
                          })()
                        }}
                      </span>
                    </div>
                  </template>
                </AppDropdownItem>
              </template>
            </template>
          </AppDropdownMenu>
        </template>

        <template #right> </template>
      </AppDock>
    </template>
  </AppPage>
</template>

<style scoped>
.text-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.dropdown-item-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
</style>
