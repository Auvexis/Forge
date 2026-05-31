<template>
  <section class="agent-chat-view" aria-label="Agent chat">
    <header v-if="store.selectedAgent" class="agent-chat-view__header">
      <span class="agent-chat-view__emoji">{{ store.selectedAgent.emoji }}</span>
      <span class="agent-chat-view__identity">
        <strong>{{ store.selectedAgent.name }}</strong>
        <span>{{ store.selectedAgent.workflowName }} · {{ store.selectedAgent.profileId }}</span>
      </span>

      <div class="agent-chat-view__actions">
        <button
          type="button"
          class="agent-chat-view__icon-button"
          :disabled="!store.selectedAgentKey"
          title="New chat"
          @click="store.openDraftSession()"
        >
          <LucideIcon name="plus" :size="16" />
        </button>
        <button
          type="button"
          class="agent-chat-view__icon-button"
          :disabled="!store.selectedAgentKey"
          title="Chat history"
          @click="historyOpen = !historyOpen"
        >
          <LucideIcon name="history" :size="16" />
        </button>
        <router-link class="agent-chat-view__icon-button" :to="workflowRoute" title="Open workflow">
          <LucideIcon name="external-link" :size="16" />
        </router-link>
      </div>

      <div v-if="historyOpen" class="agent-chat-view__floating-menu" role="dialog">
        <header>
          <strong>Chats</strong>
          <span>{{ store.sessions.length }}</span>
        </header>
        <div v-if="!store.sessions.length" class="agent-chat-view__menu-state">No chats yet.</div>
        <div
          v-for="session in store.sessions"
          :key="session.id"
          role="button"
          tabindex="0"
          class="agent-chat-view__session-row"
          :class="{ 'agent-chat-view__session-row--active': session.id === store.selectedSessionId }"
          @click="selectSession(session.id)"
          @keydown.enter.prevent="selectSession(session.id)"
          @keydown.space.prevent="selectSession(session.id)"
        >
          <span>{{ session.title }}</span>
          <small>{{ formatSessionDate(session.updatedAt) }}</small>
          <button
            type="button"
            class="agent-chat-view__session-delete"
            title="Delete chat"
            @click.stop="deleteSession(session.id)"
          >
            <LucideIcon name="trash-2" :size="14" />
          </button>
        </div>
      </div>
    </header>

    <div v-if="!store.selectedAgent" class="agent-chat-view__empty">Select an agent.</div>
    <div v-else-if="!store.hasOpenChat" class="agent-chat-view__empty">Select a chat.</div>
    <template v-else>
      <div class="agent-chat-view__messages">
        <div v-if="store.chatError" class="agent-chat-view__chat-error">
          {{ store.chatError }}
        </div>
        <article
          v-for="message in store.messages"
          :key="message.id"
          class="agent-chat-view__message"
          :class="`agent-chat-view__message--${message.role}`"
        >
          <span class="agent-chat-view__avatar">{{ messageAvatar(message) }}</span>
          <span class="agent-chat-view__role">
            <strong>{{ messageDisplayName(message) }}</strong>
            <time>{{ formatMessageTime(message) }}</time>
          </span>
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
import { computed, ref } from 'vue'
import AgentChatComposer from '@/features/agent-panel/components/AgentChatComposer.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import { useProfileStore } from '@/shared/stores/profile.store'
import { useConfirm } from '@/shared/composables/useConfirm'
import type { AgentChatMessage } from '@/features/agent-runtime/types/agent.types'

const store = useAgentPanelStore()
const profileStore = useProfileStore()
const { confirm } = useConfirm()
const historyOpen = ref(false)
const dangerousMemoryMode = 'all-agent-memory'

const workflowRoute = computed(() =>
  store.selectedAgent ? `/workflows/${encodeURIComponent(store.selectedAgent.workflowId)}` : '/workflows',
)

function selectSession(sessionId: string) {
  historyOpen.value = false
  void store.selectSession(sessionId)
}

async function deleteSession(sessionId: string) {
  const first = await confirm({
    title: 'Delete chat',
    message: 'Delete chat and session memory?',
    confirmText: 'Delete',
    variant: 'danger',
  })
  if (!first) return

  await store.deleteSession(sessionId, 'session')
}

function messageText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return ''
  const record = content as Record<string, unknown>
  if (typeof record.text === 'string') return record.text
  if (typeof record.content === 'string') return record.content
  return JSON.stringify(content)
}

function messageDisplayName(message: AgentChatMessage): string {
  if (message.role === 'user') return profileStore.currentProfile?.name ?? 'User'
  if (message.role === 'assistant') return store.selectedAgent?.name ?? 'Assistant'
  return message.role.charAt(0).toUpperCase() + message.role.slice(1)
}

function messageAvatar(message: AgentChatMessage): string {
  if (message.role === 'user') return profileStore.currentProfile?.avatarEmoji ?? 'U'
  if (message.role === 'assistant') return store.selectedAgent?.emoji ?? '🤖'
  return '•'
}

function formatMessageTime(message: AgentChatMessage): string {
  const raw = (message as { createdAt?: string; timestamp?: string }).createdAt ?? (message as { timestamp?: string }).timestamp
  const date = raw ? new Date(raw) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatSessionDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

void dangerousMemoryMode
void ['transcript-only', 'session', 'all-agent-memory']
</script>

<style scoped>
.agent-chat-view {
  position: relative;
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  background: var(--sailor-bg-base);
}

.agent-chat-view__header {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sailor-space-3);
  padding: var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border);
}

.agent-chat-view__emoji,
.agent-chat-view__avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-elevated);
}

.agent-chat-view__emoji {
  width: 40px;
  height: 40px;
  font-size: 22px;
}

.agent-chat-view__avatar {
  width: 30px;
  height: 30px;
  font-size: var(--sailor-text-base);
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
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-base);
}

.agent-chat-view__identity span {
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
}

.agent-chat-view__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--sailor-space-2);
  margin-left: auto;
}

.agent-chat-view__icon-button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-secondary);
  cursor: pointer;
}

.agent-chat-view__icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.agent-chat-view__floating-menu {
  position: absolute;
  top: calc(100% + var(--sailor-space-2));
  right: var(--sailor-space-4);
  z-index: var(--sailor-z-overlay);
  display: flex;
  width: min(340px, calc(100% - var(--sailor-space-8)));
  max-height: min(420px, 70vh);
  flex-direction: column;
  gap: var(--sailor-space-1);
  overflow: auto;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-elevated);
  padding: var(--sailor-space-2);
  box-shadow: var(--sailor-shadow-lg);
}

.agent-chat-view__floating-menu header {
  display: flex;
  justify-content: space-between;
  padding: var(--sailor-space-2);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
}

.agent-chat-view__menu-state {
  padding: var(--sailor-space-3);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
}

.agent-chat-view__session-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--sailor-space-2);
  border: 0;
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  padding: var(--sailor-space-2);
  color: var(--sailor-text-primary);
  text-align: left;
  cursor: pointer;
}

.agent-chat-view__session-row:hover,
.agent-chat-view__session-row--active {
  background: var(--sailor-button-ghost-hover);
}

.agent-chat-view__session-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-chat-view__session-row small {
  color: var(--sailor-text-muted);
}

.agent-chat-view__session-delete {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 0;
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-muted);
  cursor: pointer;
}

.agent-chat-view__session-delete:hover {
  background: var(--sailor-button-danger-hover);
  color: var(--sailor-button-danger-active-text);
}

.agent-chat-view__messages {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--sailor-space-4);
  overflow: auto;
  padding: var(--sailor-space-4);
}

.agent-chat-view__message {
  display: grid;
  max-width: min(720px, 90%);
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--sailor-space-1) var(--sailor-space-2);
}

.agent-chat-view__message--user {
  align-self: flex-end;
  grid-template-columns: minmax(0, 1fr) auto;
}

.agent-chat-view__message--user .agent-chat-view__avatar {
  grid-column: 2;
  grid-row: 1 / span 2;
}

.agent-chat-view__message--assistant,
.agent-chat-view__message--tool,
.agent-chat-view__message--system {
  align-self: flex-start;
}

.agent-chat-view__role {
  display: inline-flex;
  align-items: baseline;
  gap: var(--sailor-space-2);
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-bold);
}

.agent-chat-view__message--user .agent-chat-view__role {
  justify-content: flex-end;
}

.agent-chat-view__role time {
  color: var(--sailor-text-secondary);
  font-weight: var(--sailor-font-medium);
}

.agent-chat-view__message p {
  grid-column: 2;
  margin: 0;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  padding: 10px 12px;
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
  line-height: 1.5;
  white-space: pre-wrap;
}

.agent-chat-view__message--user p {
  grid-column: 1;
  background: var(--sailor-bg-elevated);
}

.agent-chat-view__empty {
  display: grid;
  flex: 1;
  place-items: center;
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
}

.agent-chat-view__empty--inline {
  flex: 0;
  padding: var(--sailor-space-4);
}

.agent-chat-view__chat-error {
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  padding: var(--sailor-space-3);
  color: var(--sailor-text-error);
  font-size: var(--sailor-text-sm);
}
</style>
