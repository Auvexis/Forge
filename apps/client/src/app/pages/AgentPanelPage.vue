<template>
  <main class="agent-panel-page">
    <AgentDirectoryList />
    <AgentSessionList />
    <AgentChatView />
  </main>
</template>

<script setup lang="ts">
import AgentDirectoryList from '@/features/agent-panel/components/AgentDirectoryList.vue'
import AgentSessionList from '@/features/agent-panel/components/AgentSessionList.vue'
import AgentChatView from '@/features/agent-panel/components/AgentChatView.vue'
</script>

<style scoped>
.agent-panel-page {
  display: grid;
  grid-template-columns: 280px 300px minmax(0, 1fr);
  min-height: calc(100vh - var(--app-header-height, 0px));
  background: var(--fabric-bg-page, #f7f8fb);
}

@media (max-width: 980px) {
  .agent-panel-page {
    grid-template-columns: 1fr;
  }
}
</style>
