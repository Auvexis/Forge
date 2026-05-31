<template>
  <BaseModal :is-open="ui.isOpen" max-width="1120px" height="82vh" @close="ui.close">
    <section class="global-agent-panel" aria-label="Global agent panel">
      <AgentDirectoryList />
      <AgentChatView />
    </section>
  </BaseModal>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import AgentDirectoryList from '@/features/agent-panel/components/AgentDirectoryList.vue'
import AgentChatView from '@/features/agent-panel/components/AgentChatView.vue'
import { useAgentPanelUiStore } from '@/features/agent-panel/stores/agentPanelUi.store'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import { useProfileStore } from '@/shared/stores/profile.store'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'

const ui = useAgentPanelUiStore()
const agentStore = useAgentPanelStore()
const profileStore = useProfileStore()
const workflowStore = useWorkflowStore()

watch(
  () => [
    ui.isOpen,
    profileStore.currentProfile?.id,
    profileStore.currentProfile?.name,
    profileStore.currentProfile?.avatarEmoji,
    workflowStore.activeWorkflow?.metadata.id,
    workflowStore.activeWorkflow?.metadata.name,
    workflowStore.activeWorkflow?.metadata.updatedAt,
  ] as const,
  ([isOpen]) => {
    if (isOpen) void agentStore.loadAgents('global')
  },
  { immediate: true },
)
</script>

<style scoped>
.global-agent-panel {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: var(--sailor-bg-base);
}

@media (max-width: 820px) {
  .global-agent-panel {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
