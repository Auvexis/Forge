<template>
  <BaseModal
    :is-open="isOpen"
    max-width="1180px"
    height="min(820px, 88vh)"
    @close="$emit('close')"
  >
    <section class="agent-chat-modal" aria-label="Agent chats">
      <header class="agent-chat-modal__titlebar">
        <div>
          <strong>Agents</strong>
          <span>{{ activeChat?.title ?? 'Choose an agent' }}</span>
        </div>
        <button type="button" aria-label="Close agent chat" @click="$emit('close')">×</button>
      </header>

      <div class="agent-chat-modal__workspace">
        <aside class="agent-chat-modal__sidebar">
          <div class="agent-chat-modal__sidebar-header">
            <span>Published agents</span>
            <button type="button" title="Reload agents" :disabled="directoryLoading" @click="loadDirectory">
              Refresh
            </button>
          </div>

          <div class="agent-chat-modal__directory">
            <section v-for="chat in chats" :key="chat.chatSlug">
              <button
                type="button"
                class="agent-chat-modal__agent"
                :class="{ 'is-active': chat.chatSlug === activeChatSlug }"
                @click="selectChat(chat.chatSlug)"
              >
                <span>{{ chat.title }}</span>
                <small>{{ chat.workflowName }}</small>
              </button>
              <div v-if="chat.chatSlug === activeChatSlug" class="agent-chat-modal__sessions">
                <button
                  type="button"
                  :class="{ 'is-active': !activeSessionId }"
                  @click="startNewSession"
                >
                  + New conversation
                </button>
                <button
                  v-for="session in chat.sessions"
                  :key="session.id"
                  type="button"
                  :class="{ 'is-active': session.id === activeSessionId }"
                  @click="activeSessionId = session.id"
                >
                  <span>{{ session.title }}</span>
                  <time>{{ formatSessionTime(session.updatedAt) }}</time>
                </button>
              </div>
            </section>

            <p v-if="!directoryLoading && !chats.length" class="agent-chat-modal__empty">
              No published chat agents.
            </p>
          </div>
        </aside>

        <main class="agent-chat-modal__conversation">
          <AgentSessionPanel
            v-if="activeSessionId && activeChat"
            ref="sessionPanel"
            :key="activeSessionId"
            :session-id="activeSessionId"
            :chat-slug="activeChat.chatSlug"
          />
          <div v-else class="agent-chat-modal__welcome">
            <strong>{{ activeChat ? `Start with ${activeChat.title}` : 'Select a published agent' }}</strong>
            <span v-if="activeChat">Messages and tool states will be saved in this conversation.</span>
          </div>

          <form class="agent-chat-modal__composer" @submit.prevent="sendMessage">
            <textarea
              v-model="draft"
              rows="2"
              :disabled="sending || !activeChat"
              placeholder="Message the agent…"
              aria-label="Agent message"
              @keydown.ctrl.enter.prevent="sendMessage"
            />
            <button type="submit" :disabled="!canSend">
              {{ sending ? 'Sending' : 'Send' }}
            </button>
          </form>

        </main>
      </div>
    </section>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { agentChatApi } from '@/core/api/agent-chat.api'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import type { AgentChatDirectoryEntry } from '../types/agent.types'
import AgentSessionPanel from './AgentSessionPanel.vue'
import { useAgentErrorReporter } from '../composables/useAgentErrorReporter'

const props = defineProps<{
  isOpen: boolean
}>()

defineEmits<{ close: [] }>()

const chats = ref<AgentChatDirectoryEntry[]>([])
const activeChatSlug = ref('')
const activeSessionId = ref('')
const draft = ref('')
const directoryLoading = ref(false)
const sending = ref(false)
const sessionPanel = ref<{ invalidate: (revision?: number) => void } | null>(null)
const { reportAgentError } = useAgentErrorReporter()

const activeChat = computed(() =>
  chats.value.find((chat) => chat.chatSlug === activeChatSlug.value) ?? null,
)
const canSend = computed(() =>
  Boolean(activeChat.value && draft.value.trim() && !sending.value),
)

onMounted(() => {
  if (props.isOpen) void loadDirectory()
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) void loadDirectory()
})

async function loadDirectory() {
  directoryLoading.value = true
  try {
    const entries = await agentChatApi.listChats()
    chats.value = entries
    if (!entries.some((chat) => chat.chatSlug === activeChatSlug.value)) {
      activeChatSlug.value = entries[0]?.chatSlug ?? ''
      activeSessionId.value = entries[0]?.sessions[0]?.id ?? ''
    }
  } catch (error) {
    reportAgentError(error, 'Could not load published agents.', 'directory.load')
  } finally {
    directoryLoading.value = false
  }
}

function selectChat(chatSlug: string) {
  activeChatSlug.value = chatSlug
  activeSessionId.value = chats.value
    .find((chat) => chat.chatSlug === chatSlug)
    ?.sessions[0]?.id ?? ''
}

function startNewSession() {
  activeSessionId.value = ''
  draft.value = ''
}

async function sendMessage() {
  const chat = activeChat.value
  const message = draft.value.trim()
  if (!chat || !message || sending.value) return
  sending.value = true
  try {
    if (!activeSessionId.value) {
      const session = await agentChatApi.createSession(chat.chatSlug, message.slice(0, 80))
      activeSessionId.value = session.id
      await nextTick()
    }
    sessionPanel.value?.invalidate()
    const result = await agentChatApi.sendMessage(chat.chatSlug, {
      message,
      sessionId: activeSessionId.value,
      metadata: { source: 'agent-chat-modal' },
    })
    activeSessionId.value = result.session.id
    draft.value = ''
    await loadDirectory()
    activeSessionId.value = result.session.id
  } catch (error) {
    reportAgentError(error, 'The agent could not process this message.', 'message.send')
  } finally {
    sending.value = false
  }
}

function formatSessionTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

</script>

<style scoped>
.agent-chat-modal {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: var(--fabric-agent-chat-bg);
  color: var(--fabric-agent-chat-text-primary);
}

.agent-chat-modal__titlebar {
  display: flex;
  min-height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--fabric-agent-chat-border);
  background: var(--fabric-agent-chat-header-bg);
  padding: 0 10px;
}

.agent-chat-modal__titlebar > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.agent-chat-modal__titlebar strong {
  font-size: 12px;
}

.agent-chat-modal__titlebar span,
.agent-chat-modal__sidebar-header,
.agent-chat-modal__welcome span {
  color: var(--fabric-agent-chat-text-muted);
  font-size: 10px;
}

.agent-chat-modal__titlebar button,
.agent-chat-modal__sidebar-header button {
  border: 0;
  background: transparent;
  color: var(--fabric-agent-chat-text-muted);
  cursor: pointer;
  font-size: 12px;
}

.agent-chat-modal__workspace {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 250px minmax(0, 1fr);
}

.agent-chat-modal__sidebar {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid var(--fabric-agent-chat-border);
  background: var(--fabric-agent-chat-sidebar-bg);
}

.agent-chat-modal__sidebar-header {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--fabric-agent-chat-border);
  padding: 0 8px;
  text-transform: uppercase;
}

.agent-chat-modal__directory {
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
}

.agent-chat-modal__agent,
.agent-chat-modal__sessions button {
  display: flex;
  width: 100%;
  min-width: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--fabric-agent-chat-text-secondary);
  cursor: pointer;
  text-align: left;
}

.agent-chat-modal__agent {
  flex-direction: column;
  gap: 2px;
  padding: 7px 8px;
}

.agent-chat-modal__agent span {
  color: var(--fabric-agent-chat-text-primary);
  font-size: 11px;
  font-weight: 700;
}

.agent-chat-modal__agent small,
.agent-chat-modal__sessions time {
  color: var(--fabric-agent-chat-text-muted);
  font-size: 9px;
}

.agent-chat-modal__agent:hover,
.agent-chat-modal__sessions button:hover,
.agent-chat-modal__agent.is-active,
.agent-chat-modal__sessions button.is-active {
  background: var(--fabric-agent-chat-row-active-bg);
}

.agent-chat-modal__sessions {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 1px 0 5px 10px;
  border-left: 1px solid var(--fabric-agent-chat-border);
  padding-left: 4px;
}

.agent-chat-modal__sessions button {
  min-height: 24px;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 7px;
  font-size: 10px;
}

.agent-chat-modal__sessions button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-chat-modal__conversation {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: var(--fabric-agent-chat-conversation-bg);
}

.agent-chat-modal__conversation > :deep(.agent-session-panel) {
  min-height: 0;
  flex: 1;
  border: 0;
}

.agent-chat-modal__welcome {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 5px;
}

.agent-chat-modal__welcome strong {
  font-size: 12px;
}

.agent-chat-modal__composer {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 6px;
  border-top: 1px solid var(--fabric-agent-chat-border);
  background: var(--fabric-agent-chat-composer-bg);
  padding: 8px;
}

.agent-chat-modal__composer textarea {
  min-height: 48px;
  max-height: 120px;
  resize: vertical;
  border: 1px solid var(--fabric-agent-chat-input-border);
  border-radius: 3px;
  outline: none;
  background: var(--fabric-agent-chat-input-bg);
  color: var(--fabric-agent-chat-text-primary);
  font: 11px/1.45 var(--fabric-font-ui);
  padding: 7px 8px;
}

.agent-chat-modal__composer textarea:focus {
  border-color: var(--fabric-agent-chat-accent);
}

.agent-chat-modal__composer button {
  min-width: 58px;
  height: 26px;
  border: 1px solid var(--fabric-agent-chat-accent);
  border-radius: 3px;
  background: var(--fabric-agent-chat-accent);
  color: var(--fabric-agent-chat-accent-text);
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}

.agent-chat-modal__composer button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.agent-chat-modal__empty {
  margin: 0;
  color: var(--fabric-agent-chat-danger);
  font-size: 10px;
  padding: 6px 8px;
}

.agent-chat-modal__empty {
  color: var(--fabric-agent-chat-text-muted);
}

@media (max-width: 760px) {
  .agent-chat-modal__workspace {
    grid-template-columns: 190px minmax(0, 1fr);
  }
}
</style>
