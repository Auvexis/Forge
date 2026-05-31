<template>
  <section class="agent-chat-view" aria-label="Agent chat">
    <header v-if="store.selectedAgent" class="agent-chat-view__header">
      <span class="agent-chat-view__emoji">{{ store.selectedAgent.emoji }}</span>
      <span class="agent-chat-view__identity">
        <strong>{{ store.selectedAgent.name }}</strong>
        <span>{{ store.selectedAgent.workflowName }} · {{ store.selectedAgent.profileId }}</span>
      </span>
      <router-link class="agent-chat-view__workflow" :to="workflowRoute">
        <LucideIcon name="external-link" :size="16" />
      </router-link>
    </header>

    <div v-if="!store.selectedAgent" class="agent-chat-view__empty">Select an agent.</div>
    <div v-else-if="!store.selectedSession" class="agent-chat-view__empty">Create a chat.</div>
    <template v-else>
      <div class="agent-chat-view__messages">
        <article
          v-for="message in store.messages"
          :key="message.id"
          class="agent-chat-view__message"
          :class="`agent-chat-view__message--${message.role}`"
        >
          <span class="agent-chat-view__role">{{ message.role }}</span>
          <p>{{ messageText(message.content) }}</p>
        </article>
        <div v-if="!store.messages.length" class="agent-chat-view__empty agent-chat-view__empty--inline">
          No messages yet.
        </div>
      </div>
      <AgentChatComposer :sending="store.sending" @send="store.sendMessage" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AgentChatComposer from '@/features/agent-panel/components/AgentChatComposer.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'

const store = useAgentPanelStore()
const workflowRoute = computed(() =>
  store.selectedAgent ? `/workflows/${encodeURIComponent(store.selectedAgent.workflowId)}` : '/workflows',
)

function messageText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return ''
  const record = content as Record<string, unknown>
  if (typeof record.text === 'string') return record.text
  if (typeof record.content === 'string') return record.content
  return JSON.stringify(content)
}
</script>

<style scoped>
.agent-chat-view {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  background: #ffffff;
}

.agent-chat-view__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.agent-chat-view__emoji {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 22px;
}

.agent-chat-view__identity {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.agent-chat-view__identity strong,
.agent-chat-view__identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-chat-view__identity strong {
  color: #111827;
  font-size: 15px;
}

.agent-chat-view__identity span {
  color: #64748b;
  font-size: 12px;
}

.agent-chat-view__workflow {
  display: grid;
  width: 34px;
  height: 34px;
  margin-left: auto;
  place-items: center;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  color: #334155;
}

.agent-chat-view__messages {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  padding: 18px;
}

.agent-chat-view__message {
  max-width: min(720px, 90%);
}

.agent-chat-view__message--user {
  align-self: flex-end;
}

.agent-chat-view__message--assistant,
.agent-chat-view__message--tool,
.agent-chat-view__message--system {
  align-self: flex-start;
}

.agent-chat-view__role {
  display: block;
  margin-bottom: 4px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.agent-chat-view__message p {
  margin: 0;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px 12px;
  color: #111827;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.agent-chat-view__message--user p {
  background: #ecfeff;
}

.agent-chat-view__empty {
  display: grid;
  flex: 1;
  place-items: center;
  color: #64748b;
  font-size: 14px;
}

.agent-chat-view__empty--inline {
  flex: 0;
  padding: 18px;
}
</style>
