<template>
  <main class="agents-page" aria-label="Agents">
    <button type="button" class="agents-page__open" @click="chatOpen = true">
      Open agent chats
    </button>
    <AgentChatModal :is-open="chatOpen" @close="chatOpen = false" />
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AgentChatModal from '@/features/agent-runtime/components/AgentChatModal.vue'

const chatOpen = ref(true)
</script>

<style scoped>
.agents-page {
  display: grid;
  width: 100%;
  min-height: 100%;
  place-items: center;
  background: var(--fabric-agent-chat-page-bg);
}

.agents-page__open {
  height: 28px;
  border: 1px solid var(--fabric-agent-chat-accent);
  border-radius: 3px;
  background: var(--fabric-agent-chat-accent);
  color: var(--fabric-agent-chat-accent-text);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  padding: 0 12px;
}
</style>
