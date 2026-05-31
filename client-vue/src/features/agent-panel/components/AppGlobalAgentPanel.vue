<template>
  <BaseModal :is-open="ui.isOpen" max-width="1120px" height="82vh" @close="ui.close">
    <section class="global-agent-panel" aria-label="Global agent panel">
      <AgentDirectoryList />
      <AgentChatView />
    </section>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from '@/shared/components/base/BaseModal.vue'
import AgentDirectoryList from '@/features/agent-panel/components/AgentDirectoryList.vue'
import AgentChatView from '@/features/agent-panel/components/AgentChatView.vue'
import { useAgentPanelUiStore } from '@/features/agent-panel/stores/agentPanelUi.store'

const ui = useAgentPanelUiStore()
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
