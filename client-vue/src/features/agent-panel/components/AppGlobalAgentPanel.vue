<template>
  <BaseModal :is-open="ui.isOpen" max-width="1380px" height="86vh" @close="closePanel">
    <section
      class="global-agent-panel"
      aria-label="Global agent panel"
    >
      <AgentDirectoryList />
      <AgentSessionList />
      <AgentChatView />
    </section>
  </BaseModal>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import AgentDirectoryList from '@/features/agent-panel/components/AgentDirectoryList.vue'
import AgentSessionList from '@/features/agent-panel/components/AgentSessionList.vue'
import AgentChatView from '@/features/agent-panel/components/AgentChatView.vue'
import { useAgentPanelUiStore } from '@/features/agent-panel/stores/agentPanelUi.store'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import { useProfileStore } from '@/shared/stores/profile.store'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'

const ui = useAgentPanelUiStore()
const agentStore = useAgentPanelStore()
const profileStore = useProfileStore()
const workflowStore = useWorkflowStore()

function closePanel() {
  agentStore.disposeActiveExecution()
  ui.close()
}

watch(
  () => [
    ui.isOpen,
    profileStore.currentProfile?.id,
    profileStore.currentProfile?.name,
    profileStore.currentProfile?.avatarEmoji,
    workflowStore.activeWorkflow?.metadata.id,
    workflowStore.activeWorkflow?.metadata.name,
    workflowStore.activeWorkflow?.metadata.updatedAt,
    agentStore.devSessionContext?.workflowId,
    agentStore.devSessionContext?.triggerNodeId,
    agentStore.devSessionContext?.agentNodeId,
  ] as const,
  ([isOpen]) => {
    if (!isOpen) agentStore.disposeActiveExecution()
    if (!isOpen) return
    const devContext = agentStore.devSessionContext
    if (devContext) {
      void agentStore.loadAgents('dev-session', devContext)
      return
    }
    void agentStore.loadAgents('global')
  },
  { immediate: true },
)
</script>

<style scoped>
:deep(.base-modal-container) {
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-surface);
}

.global-agent-panel {
  display: grid;
  grid-template-columns: 68px 256px minmax(0, 1fr);
  min-height: 0;
  height: 100%;
  overflow: hidden;
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
}

@media (max-width: 820px) {
  .global-agent-panel {
    grid-template-columns: 60px minmax(220px, 36vw) minmax(0, 1fr);
  }
}
</style>
