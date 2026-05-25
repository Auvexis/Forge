<template>
  <section class="chat-session-panel">
    <header class="chat-session-panel__header">
      <h3>{{ title }}</h3>
      <span v-if="sessionId" class="chat-session-panel__session">{{ sessionId }}</span>
    </header>

    <div class="chat-session-panel__messages">
      <article
        v-for="message in messages"
        :key="message.id"
        class="chat-session-panel__message"
        :data-role="message.role"
      >
        <strong>{{ formatRole(message.role) }}</strong>
        <p>{{ messageContent(message.content) }}</p>
      </article>

      <div v-if="!messages.length" class="chat-session-panel__empty">No messages yet.</div>
    </div>

    <form class="chat-session-panel__composer" @submit.prevent="sendCurrentMessage">
      <BaseTextarea
        v-model="draft"
        :rows="3"
        :disabled="pending"
        placeholder="Send a test message"
        aria-label="Chat message"
      />

      <div class="chat-session-panel__actions">
        <span v-if="safeError" class="chat-session-panel__error">{{ safeError }}</span>
        <BaseButton type="submit" variant="primary" :disabled="!canSend || pending" :loading="pending">
          Send
        </BaseButton>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import { agentChatApi } from '@/core/api/agent-chat.api'
import type { AgentChatMessage, AgentChatMessageRole } from '@/features/agent-runtime/types/agent.types'

const props = withDefaults(
  defineProps<{
    chatSlug: string
    title?: string
  }>(),
  {
    title: 'Agent Chat',
  },
)

const draft = ref('')
const pending = ref(false)
const safeError = ref('')
const sessionId = ref<string | undefined>()
const messages = ref<AgentChatMessage[]>([])

const canSend = computed(() => draft.value.trim().length > 0)

async function sendCurrentMessage() {
  const message = draft.value.trim()
  if (!message || pending.value) return

  pending.value = true
  safeError.value = ''

  try {
    const result = await agentChatApi.sendMessage(props.chatSlug, {
      message,
      sessionId: sessionId.value,
    })

    sessionId.value = result.session.id
    messages.value = result.messages
    appendAssistantResponse(result.assistantResponse)
    draft.value = ''
  } catch {
    safeError.value = 'Unable to send message.'
  } finally {
    pending.value = false
  }
}

function appendAssistantResponse(assistantResponse: unknown) {
  if (assistantResponse === undefined || assistantResponse === null) return

  const lastMessage = messages.value[messages.value.length - 1]
  if (lastMessage?.role === 'assistant') return

  messages.value = [
    ...messages.value,
    {
      id: `assistant-${Date.now()}`,
      profileId: '',
      sessionId: sessionId.value ?? '',
      role: 'assistant',
      content: assistantResponse,
      createdAt: new Date().toISOString(),
    },
  ]
}

function messageContent(content: unknown) {
  return typeof content === 'string' ? content : JSON.stringify(content)
}

function formatRole(role: AgentChatMessageRole) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}
</script>

<style scoped>
.chat-session-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-3);
}

.chat-session-panel__header,
.chat-session-panel__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-3);
}

.chat-session-panel__header h3 {
  margin: 0;
  font-size: var(--sailor-text-sm);
}

.chat-session-panel__session,
.chat-session-panel__empty,
.chat-session-panel__error {
  font-size: var(--sailor-text-xs);
}

.chat-session-panel__session,
.chat-session-panel__empty {
  color: var(--sailor-text-muted);
}

.chat-session-panel__messages {
  display: flex;
  min-height: 160px;
  max-height: 420px;
  flex-direction: column;
  gap: var(--sailor-space-2);
  overflow: auto;
}

.chat-session-panel__message {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-1);
  padding: var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-overlay);
}

.chat-session-panel__message[data-role='user'] {
  border-color: var(--sailor-border-strong);
}

.chat-session-panel__message strong,
.chat-session-panel__message p {
  margin: 0;
  font-size: var(--sailor-text-xs);
}

.chat-session-panel__message p {
  color: var(--sailor-text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-session-panel__composer {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.chat-session-panel__error {
  color: var(--sailor-text-error);
}
</style>
