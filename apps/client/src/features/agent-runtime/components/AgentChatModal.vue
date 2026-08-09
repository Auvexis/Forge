<template>
  <BaseModal
    :is-open="isOpen"
    surface="window"
    window-id="agent-chat"
    config-id="agent-chat"
    title="Agents"
    max-width="1180px"
    height="min(820px, 88vh)"
    @close="$emit('close')"
  >
    <template #window-title>
      <button
        type="button"
        class="agent-chat-modal__sidebar-toggle"
        :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="sidebarCollapsed = !sidebarCollapsed"
      >
        <LucideIcon :name="sidebarCollapsed ? 'panel-left-open' : 'panel-left-close'" :size="15" />
      </button>
    </template>
    <section class="agent-chat-modal" aria-label="Agent chats">
      <div
        class="agent-chat-modal__workspace"
        :class="{ 'agent-chat-modal__workspace--collapsed': sidebarCollapsed }"
      >
        <aside class="agent-chat-modal__sidebar">
          <div class="agent-chat-modal__directory">
            <section
              v-for="chat in chats"
              :key="chat.chatSlug"
              class="agent-chat-modal__group"
            >
              <button
                type="button"
                class="agent-chat-modal__agent"
                :class="{ 'is-active': chat.chatSlug === activeChatSlug }"
                @click="toggleChat(chat.chatSlug)"
              >
                <span class="agent-chat-modal__agent-avatar" aria-hidden="true">
                  {{ chat.agentAvatar || agentInitial(chat.agentName) }}
                </span>
                <span class="agent-chat-modal__agent-copy">
                  <strong>{{ chat.agentName }}</strong>
                </span>
                <span
                  class="agent-chat-modal__agent-action"
                  role="button"
                  tabindex="0"
                  title="New conversation"
                  aria-label="New conversation"
                  @click.stop="startNewSessionFor(chat.chatSlug)"
                  @keydown.enter.stop.prevent="startNewSessionFor(chat.chatSlug)"
                  @keydown.space.stop.prevent="startNewSessionFor(chat.chatSlug)"
                >
                  <LucideIcon name="pen-line" :size="13" />
                </span>
              </button>

              <div
                v-if="chat.chatSlug === expandedChatSlug"
                class="agent-chat-modal__sessions"
              >
                <div
                  v-for="session in chat.sessions"
                  :key="session.id"
                  class="agent-chat-modal__session"
                  :class="{
                    'is-active': session.id === activeSessionId,
                    'is-renaming': renamingSessionId === session.id,
                  }"
                >
                  <input
                    v-if="renamingSessionId === session.id"
                    v-model="renamingTitle"
                    class="agent-chat-modal__session-input"
                    autofocus
                    aria-label="Chat name"
                    @click.stop
                    @keydown.enter.prevent="commitRenameSession(session)"
                    @keydown.esc.prevent="cancelRenameSession"
                    @blur="commitRenameSession(session)"
                  />
                  <button v-else type="button" @click="activeSessionId = session.id">
                    <span>{{ session.title || "Untitled conversation" }}</span>
                  </button>
                  <BaseToolDropdown
                    class="agent-chat-modal__session-menu"
                    :dropdown-id="`agent-chat-session-${session.id}`"
                    label="Chat actions"
                    icon="ellipsis"
                    hint="Chat actions"
                    position="bottom"
                    :tools="sessionActionTools"
                    :active-dropdown-id="activeSessionMenuId"
                    :is-any-dropdown-open="Boolean(activeSessionMenuId)"
                    @open="activeSessionMenuId = $event"
                    @close="closeSessionMenu"
                    @select="handleSessionAction(session, $event.id)"
                    @dragstart.prevent
                  />
                </div>
              </div>
            </section>

            <p
              v-if="!directoryLoading && !chats.length"
              class="agent-chat-modal__empty"
            >
              No published chat agents yet.
            </p>
          </div>
        </aside>

        <main class="agent-chat-modal__conversation">
          <header class="agent-chat-modal__conversation-header">
            <div class="agent-chat-modal__active-agent">
              <span class="agent-chat-modal__active-avatar" aria-hidden="true">
                {{ activeChat ? activeChat.agentAvatar || agentInitial(activeChat.agentName) : "AI" }}
              </span>
              <div>
                <strong>{{ activeChat?.agentName ?? "Select an agent" }}</strong>
                <span>{{
                  activeChat?.title ??
                  "Choose a published chat agent to begin."
                }}</span>
              </div>
            </div>
            <div v-if="activeChat" class="agent-chat-modal__meta">
              <span>{{ activeChat.sessions.length }} sessions</span>
              <span>{{ activeSessionId ? "Active conversation" : "New conversation" }}</span>
            </div>
          </header>

          <AgentSessionPanel
            v-if="activeSessionId && activeChat"
            ref="sessionPanel"
            :key="activeSessionId"
            :session-id="activeSessionId"
            :chat-slug="activeChat.chatSlug"
          />
          <div v-else class="agent-chat-modal__welcome">
            <div class="agent-chat-modal__welcome-icon">
              <LucideIcon
                :name="activeChat ? 'message-square-plus' : 'bot'"
                :size="24"
              />
            </div>
            <strong>{{
              activeChat
                ? `Start with ${activeChat.agentName}`
                : "Select a published agent"
            }}</strong>
            <span>{{
              activeChat
                ? "Send the first message to create a saved conversation."
                : "Published chat triggers appear here when workflows are available."
            }}</span>
          </div>

          <form class="agent-chat-modal__composer" @submit.prevent="sendMessage">
            <div class="agent-chat-modal__composer-box">
              <textarea
                v-model="draft"
                rows="2"
                :disabled="sending || !activeChat"
                placeholder="Message the agent..."
                aria-label="Agent message"
                @keydown.ctrl.enter.prevent="sendMessage"
              />
              <button type="submit" :disabled="!canSend">
                <LucideIcon
                  :name="sending ? 'loader-2' : 'send-horizontal'"
                  :size="15"
                />
                <span>{{ sending ? "Sending" : "Send" }}</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </section>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { agentChatApi } from "@/core/api/agent-chat.api";
import BaseModal from "@/shared/components/base/BaseModal.vue";
import BaseToolDropdown from "@/shared/components/base/BaseToolDropdown.vue";
import { useConfirm } from "@/shared/composables/useConfirm";
import LucideIcon from "@/shared/icons/LucideIcon.vue";
import type { AgentChatDirectoryEntry, AgentChatSession } from "../types/agent.types";
import { useAgentErrorReporter } from "../composables/useAgentErrorReporter";
import AgentSessionPanel from "./AgentSessionPanel.vue";

const props = defineProps<{
  isOpen: boolean;
  initialChatSlug?: string;
}>();

defineEmits<{ close: [] }>();

const chats = ref<AgentChatDirectoryEntry[]>([]);
const activeChatSlug = ref("");
const expandedChatSlug = ref("");
const activeSessionId = ref("");
const draft = ref("");
const directoryLoading = ref(false);
const sending = ref(false);
const activeSessionMenuId = ref<string | null>(null);
const sidebarCollapsed = ref(false);
const renamingSessionId = ref("");
const renamingTitle = ref("");
const sessionPanel = ref<{
  invalidate: (revision?: number) => void;
  startLiveMessage: (message: string) => string;
  finishLiveMessage: (id: string) => Promise<void>;
} | null>(null);
const { reportAgentError } = useAgentErrorReporter();
const { confirm } = useConfirm();
const sessionActionTools = [
  { id: "rename", label: "Rename chat", icon: "pencil" },
  { id: "delete", label: "Delete chat", icon: "trash-2" },
];

const activeChat = computed(
  () =>
    chats.value.find((chat) => chat.chatSlug === activeChatSlug.value) ?? null,
);
const canSend = computed(() =>
  Boolean(activeChat.value && draft.value.trim() && !sending.value),
);

onMounted(() => {
  if (props.isOpen) void loadDirectory();
});

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) void loadDirectory();
  },
);

watch(
  () => props.initialChatSlug,
  (chatSlug) => {
    if (props.isOpen && chatSlug) selectChat(chatSlug);
  },
);

async function loadDirectory() {
  directoryLoading.value = true;
  try {
    const entries = await agentChatApi.listChats();
    chats.value = entries;
    const preferredChatSlug = props.initialChatSlug?.trim() ?? "";
    const nextChatSlug =
      preferredChatSlug &&
      entries.some((chat) => chat.chatSlug === preferredChatSlug)
        ? preferredChatSlug
        : activeChatSlug.value;
    if (!entries.some((chat) => chat.chatSlug === nextChatSlug)) {
      selectChat(entries[0]?.chatSlug ?? "");
    } else if (nextChatSlug !== activeChatSlug.value) {
      selectChat(nextChatSlug);
    }
  } catch (error) {
    reportAgentError(
      error,
      "Could not load published agents.",
      "directory.load",
    );
  } finally {
    directoryLoading.value = false;
  }
}

function selectChat(chatSlug: string) {
  activeChatSlug.value = chatSlug;
  expandedChatSlug.value = chatSlug;
  activeSessionId.value =
    chats.value.find((chat) => chat.chatSlug === chatSlug)?.sessions[0]?.id ??
    "";
}

function toggleChat(chatSlug: string) {
  activeChatSlug.value = chatSlug;
  expandedChatSlug.value = expandedChatSlug.value === chatSlug ? "" : chatSlug;
}

function startNewSessionFor(chatSlug = activeChatSlug.value) {
  activeChatSlug.value = chatSlug;
  expandedChatSlug.value = chatSlug;
  activeSessionId.value = "";
  draft.value = "";
}

async function sendMessage() {
  const chat = activeChat.value;
  const message = draft.value.trim();
  if (!chat || !message || sending.value) return;
  sending.value = true;
  let optimisticId: string | null = null;
  try {
    if (!activeSessionId.value) {
      const session = await agentChatApi.createSession(
        chat.chatSlug,
        message.slice(0, 80),
      );
      activeSessionId.value = session.id;
      await nextTick();
    }
    optimisticId = sessionPanel.value?.startLiveMessage(message) ?? null;
    draft.value = "";
    const result = await agentChatApi.sendMessage(chat.chatSlug, {
      message,
      sessionId: activeSessionId.value,
      metadata: { source: "agent-chat-modal" },
    });
    activeSessionId.value = result.session.id;
    await loadDirectory();
    activeSessionId.value = result.session.id;
  } catch (error) {
    reportAgentError(
      error,
      "The agent could not process this message.",
      "message.send",
    );
    sessionPanel.value?.invalidate();
  } finally {
    if (optimisticId) await sessionPanel.value?.finishLiveMessage(optimisticId);
    sending.value = false;
  }
}

function closeSessionMenu(id: string) {
  if (activeSessionMenuId.value === id) activeSessionMenuId.value = null;
}

async function handleSessionAction(session: AgentChatSession, actionId: string) {
  if (actionId === "rename") {
    await renameSession(session);
    return;
  }
  if (actionId === "delete") await deleteSession(session);
}

async function renameSession(session: AgentChatSession) {
  renamingSessionId.value = session.id;
  renamingTitle.value = session.title || "Untitled conversation";
}

async function deleteSession(session: AgentChatSession) {
  const shouldDelete = await confirm({
    title: "Delete chat",
    message: `Delete "${session.title || "Untitled conversation"}"? This cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
    variant: "danger",
  });
  if (!shouldDelete) return;
  try {
    await agentChatApi.deleteSession(session.id);
    if (activeSessionId.value === session.id) activeSessionId.value = "";
    await loadDirectory();
  } catch (error) {
    reportAgentError(error, "Could not delete chat.", "session.delete");
  }
}

function cancelRenameSession() {
  renamingSessionId.value = "";
  renamingTitle.value = "";
}

async function commitRenameSession(session: AgentChatSession) {
  if (renamingSessionId.value !== session.id) return;
  const nextTitle = renamingTitle.value.trim().slice(0, 80);
  if (!nextTitle || nextTitle === session.title) {
    cancelRenameSession();
    return;
  }
  try {
    await agentChatApi.renameSession(session.id, nextTitle);
    cancelRenameSession();
    await loadDirectory();
  } catch (error) {
    reportAgentError(error, "Could not rename chat.", "session.rename");
  }
}

function agentInitial(value?: string) {
  return value?.trim().charAt(0).toUpperCase() || "A";
}
</script>

<style scoped>
.agent-chat-modal {
  display: flex;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  background: var(--fabric-agent-chat-bg);
  color: var(--fabric-agent-chat-text-primary);
}

.agent-chat-modal__workspace {
  display: grid;
  width: 100%;
  min-height: 0;
  grid-template-columns: 280px minmax(0, 1fr);
  transition: grid-template-columns var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.agent-chat-modal__workspace--collapsed {
  grid-template-columns: 0 minmax(0, 1fr);
}

.agent-chat-modal__sidebar {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--fabric-agent-chat-border);
  background: var(--fabric-agent-chat-sidebar-bg);
}

.agent-chat-modal__sidebar-toggle {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  margin-left: 0;
  border: 0;
  border-radius: var(--fabric-base-topbar-button-radius);
  background: transparent;
  color: var(--fabric-app-topbar-topbar-button-text);
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.agent-chat-modal__sidebar-toggle:hover {
  background: var(--fabric-base-topbar-button-topbar-search-hover-bg);
  color: var(--fabric-base-topbar-button-topbar-search-hover-text);
}

.agent-chat-modal__conversation-header {
  display: flex;
  min-height: 54px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--fabric-agent-chat-border);
  background: var(--fabric-agent-chat-header-bg);
  padding: 0 14px;
}

.agent-chat-modal__active-agent > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.agent-chat-modal__active-agent strong,
.agent-chat-modal__welcome strong {
  overflow: hidden;
  color: var(--fabric-agent-chat-text-primary);
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-chat-modal__active-agent span,
.agent-chat-modal__welcome span,
.agent-chat-modal__meta {
  color: var(--fabric-agent-chat-text-muted);
  font-size: 11px;
}

.agent-chat-modal__directory {
  min-height: 0;
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 8px;
  scrollbar-gutter: stable;
}

.agent-chat-modal__group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.agent-chat-modal__agent,
.agent-chat-modal__session {
  display: flex;
  width: 100%;
  min-width: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--fabric-agent-chat-text-secondary);
  cursor: pointer;
  text-align: left;
}

.agent-chat-modal__agent {
  align-items: center;
  gap: 9px;
  min-height: 40px;
  padding: 5px 6px;
  position: relative;
}

.agent-chat-modal__agent-avatar,
.agent-chat-modal__active-avatar,
.agent-chat-modal__welcome-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid rgba(128, 128, 128, 0.18);
  background: rgba(128, 128, 128, 0.08);
  color: var(--fabric-agent-chat-text-primary);
}

.agent-chat-modal__agent-avatar {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 800;
}

.agent-chat-modal__agent-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.agent-chat-modal__agent-copy strong,
.agent-chat-modal__session span {
  overflow: hidden;
  color: var(--fabric-agent-chat-text-primary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-chat-modal__agent-action {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  color: var(--fabric-agent-chat-text-muted);
  opacity: 0;
  transition:
    opacity var(--fabric-duration-fast) var(--fabric-ease-standard),
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.agent-chat-modal__agent:hover .agent-chat-modal__agent-action,
.agent-chat-modal__agent:focus-visible .agent-chat-modal__agent-action {
  opacity: 1;
}

.agent-chat-modal__agent-action:hover {
  background: rgba(128, 128, 128, 0.12);
  color: var(--fabric-agent-chat-text-primary);
}

.agent-chat-modal__agent:hover,
.agent-chat-modal__session:hover,
.agent-chat-modal__agent.is-active,
.agent-chat-modal__session.is-active {
  background: rgba(128, 128, 128, 0.08);
}

.agent-chat-modal__sessions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 0 8px 39px;
}

.agent-chat-modal__session {
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 2px 8px;
  font-size: 11px;
}

.agent-chat-modal__session > button {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.agent-chat-modal__session-input {
  min-width: 0;
  flex: 1;
  height: 24px;
  border: 1px solid var(--fabric-agent-chat-border);
  border-radius: 5px;
  background: var(--fabric-agent-chat-conversation-bg);
  color: var(--fabric-agent-chat-text-primary);
  font: inherit;
  outline: none;
  padding: 0 6px;
}

.agent-chat-modal__session-input:focus {
  border-color: var(--fabric-agent-chat-text-muted);
}

.agent-chat-modal__session-menu {
  flex: 0 0 auto;
  opacity: 0;
  transition: opacity var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.agent-chat-modal__session:hover .agent-chat-modal__session-menu,
.agent-chat-modal__session:focus-within .agent-chat-modal__session-menu {
  opacity: 1;
}

.agent-chat-modal__workspace--collapsed .agent-chat-modal__sidebar {
  border-right: 0;
  visibility: hidden;
}

.agent-chat-modal__conversation {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: var(--fabric-agent-chat-conversation-bg);
}

.agent-chat-modal__active-agent {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.agent-chat-modal__active-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  font-weight: 800;
}

.agent-chat-modal__meta {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.agent-chat-modal__meta span {
  padding: 3px 7px;
  border: 1px solid var(--fabric-agent-chat-border);
  border-radius: 999px;
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.agent-chat-modal__welcome-icon {
  width: 46px;
  height: 46px;
  border-radius: 11px;
  margin-bottom: 4px;
}

.agent-chat-modal__composer {
  flex: 0 0 auto;
  border-top: 1px solid var(--fabric-agent-chat-border);
  background: var(--fabric-agent-chat-composer-bg);
  padding: 10px;
}

.agent-chat-modal__composer-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;
  border: 1px solid var(--fabric-agent-chat-input-border);
  border-radius: 8px;
  background: var(--fabric-agent-chat-input-bg);
  padding: 8px;
}

.agent-chat-modal__composer textarea {
  min-height: 44px;
  max-height: 120px;
  resize: vertical;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--fabric-agent-chat-text-primary);
  font: 12px/1.45 var(--fabric-font-ui);
}

.agent-chat-modal__composer button {
  display: inline-flex;
  height: 32px;
  min-width: 76px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--fabric-agent-chat-accent);
  border-radius: 6px;
  background: var(--fabric-agent-chat-accent);
  color: var(--fabric-agent-chat-accent-text);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}

.agent-chat-modal__composer button:disabled,
.agent-chat-modal__composer button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.agent-chat-modal__empty {
  margin: 8px 2px;
  padding: 14px 10px;
  border: 1px dashed var(--fabric-agent-chat-border);
  border-radius: 8px;
  color: var(--fabric-agent-chat-text-muted);
  font-size: 11px;
  text-align: center;
}

@media (max-width: 860px) {
  .agent-chat-modal__workspace {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .agent-chat-modal__meta {
    display: none;
  }
}
</style>
