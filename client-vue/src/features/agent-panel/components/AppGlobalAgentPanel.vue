<template>
  <BaseModal :is-open="ui.isOpen" max-width="1380px" height="86vh" @close="ui.close">
    <section
      class="global-agent-panel"
      :class="{ 'global-agent-panel--history-collapsed': agentStore.directoryCollapsed }"
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
    if (isOpen) void agentStore.loadAgents(agentStore.agentScope)
  },
  { immediate: true },
)
</script>

<style scoped>
:deep(.base-modal-container) {
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-xl);
  background: var(--sailor-bg-surface);
}

.global-agent-panel {
  display: grid;
  grid-template-columns: 68px 256px minmax(0, 1fr);
  min-height: 0;
  height: 100%;
  overflow: hidden;
  border-radius: var(--sailor-radius-xl);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  transition: grid-template-columns var(--sailor-duration-slow) var(--sailor-ease-standard);
}

.global-agent-panel--history-collapsed {
  grid-template-columns: 68px 0 minmax(0, 1fr);
}

.global-agent-panel :deep(.agent-session-list) {
  transition:
    opacity var(--sailor-duration-base) var(--sailor-ease-standard),
    padding var(--sailor-duration-slow) var(--sailor-ease-standard),
    border-color var(--sailor-duration-base) var(--sailor-ease-standard);
}

.global-agent-panel--history-collapsed :deep(.agent-session-list) {
  overflow: hidden;
  border-right-color: transparent;
  padding-inline: 0;
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 820px) {
  .global-agent-panel {
    grid-template-columns: 60px minmax(220px, 36vw) minmax(0, 1fr);
  }

  .global-agent-panel--history-collapsed {
    grid-template-columns: 60px 0 minmax(0, 1fr);
  }
}
</style>
