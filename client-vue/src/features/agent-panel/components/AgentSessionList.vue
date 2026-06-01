<template>
  <aside class="agent-session-list" aria-label="Agent chat sessions">
    <header class="agent-session-list__header">
      <h2>Chat</h2>
      <BaseButton
        title="Search chats"
        size="icon"
        icon-left="search"
        variant="ghost"
        @click="searchOpen = !searchOpen"
      />
    </header>

    <BaseInput
      v-if="searchOpen"
      v-model="sessionSearch"
      class="agent-session-list__search"
      icon-left="search"
      placeholder="Search chats"
      aria-label="Search chats"
    />

    <BaseButton
      class="agent-session-list__new"
      :disabled="!store.selectedAgentKey"
      icon-left="plus"
      icon-right="sparkles"
      variant="primary"
      full-width
      @click="store.createSession()"
    >
      New Chat
    </BaseButton>

    <div class="agent-session-list__meta">
      <span>{{ store.selectedAgent?.name ?? 'No agent selected' }}</span>
      <small>{{ filteredSessions.length }} chats</small>
    </div>

    <div v-if="!store.selectedAgentKey" class="agent-session-list__state">Select an agent.</div>
    <div v-else-if="!filteredSessions.length" class="agent-session-list__state">
      {{ sessionSearch.trim() ? 'No chats match this search.' : 'No chats yet.' }}
    </div>

    <div class="agent-session-list__rows">
      <div
        v-for="session in filteredSessions"
        :key="session.id"
        class="agent-session-list__row"
        :class="{ 'agent-session-list__row--active': session.id === store.selectedSessionId }"
      >
        <button type="button" class="agent-session-list__select" @click="store.selectSession(session.id)">
          <span class="agent-session-list__title">{{ session.title }}</span>
          <span class="agent-session-list__date">{{ formatSessionDate(session.updatedAt) }}</span>
        </button>
        <button
          type="button"
          class="agent-session-list__delete"
          title="Delete chat"
          @click="openDeleteMenu(session.id)"
        >
          <LucideIcon name="ellipsis" :size="15" />
        </button>
      </div>
    </div>

    <div v-if="deleteSessionId" class="agent-session-list__delete-menu" role="dialog">
      <h3>Delete chat</h3>
      <label v-for="option in memoryOptions" :key="option.value">
        <input v-model="selectedMemoryMode" type="radio" :value="option.value" />
        <span>{{ option.label }}</span>
      </label>
      <label v-if="selectedMemoryMode === dangerousMemoryMode" class="agent-session-list__confirm">
        <input v-model="confirmedDangerousDelete" type="checkbox" />
        <span>Confirm all agent memory deletion</span>
      </label>
      <div class="agent-session-list__delete-actions">
        <BaseButton type="button" size="sm" variant="ghost" @click="closeDeleteMenu">Cancel</BaseButton>
        <BaseButton type="button" size="sm" variant="danger" :disabled="deleteBlocked" @click="confirmDeleteSession">
          Delete
        </BaseButton>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'

const store = useAgentPanelStore()
const searchOpen = ref(false)
const sessionSearch = ref('')
const dangerousMemoryMode = 'all-agent-memory'
const deleteSessionId = ref('')
const selectedMemoryMode = ref<'transcript-only' | 'session' | typeof dangerousMemoryMode>('session')
const confirmedDangerousDelete = ref(false)
const memoryOptions = [
  { value: 'transcript-only', label: 'Delete chat only' },
  { value: 'session', label: 'Delete chat and session memory' },
  { value: dangerousMemoryMode, label: 'Delete chat and all agent memory' },
] as const
const deleteBlocked = computed(
  () => selectedMemoryMode.value === dangerousMemoryMode && !confirmedDangerousDelete.value,
)
const filteredSessions = computed(() => {
  const query = sessionSearch.value.trim().toLowerCase()
  if (!query) return store.sessions
  return store.sessions.filter((session) => session.title.toLowerCase().includes(query))
})

function formatSessionDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function openDeleteMenu(sessionId: string) {
  deleteSessionId.value = sessionId
  selectedMemoryMode.value = 'session'
  confirmedDangerousDelete.value = false
}

function closeDeleteMenu() {
  deleteSessionId.value = ''
  confirmedDangerousDelete.value = false
}

async function confirmDeleteSession() {
  if (!deleteSessionId.value || deleteBlocked.value) return
  await store.deleteSession(deleteSessionId.value, selectedMemoryMode.value)
  closeDeleteMenu()
}
</script>

<style scoped>
.agent-session-list {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  gap: var(--sailor-space-3);
  border-right: 1px solid rgba(12, 17, 29, 0.08);
  background: #ffffff;
  padding: var(--sailor-space-4) var(--sailor-space-3);
}

.agent-session-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-2);
}

.agent-session-list__header h2 {
  margin: 0;
  color: #0b1220;
  font-size: var(--sailor-text-sm);
  font-weight: var(--sailor-font-semibold);
}

.agent-session-list__header :deep(.base-button) {
  width: 28px;
  height: 28px;
  color: #475467;
}

.agent-session-list__search {
  width: 100%;
}

.agent-session-list__new :deep(.base-button),
.agent-session-list__new {
  height: 30px;
  border-color: #061025;
  border-radius: var(--sailor-radius-full);
  background: #061025;
  color: #ffffff;
  font-size: var(--sailor-text-xs);
  box-shadow: 0 10px 18px rgba(6, 16, 37, 0.18);
}

.agent-session-list__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(12, 17, 29, 0.08);
  padding-top: var(--sailor-space-3);
  color: #667085;
  font-size: 11px;
}

.agent-session-list__meta span {
  overflow: hidden;
  color: #98a2b3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-session-list__state {
  color: #667085;
  font-size: var(--sailor-text-xs);
  line-height: 1.4;
}

.agent-session-list__rows {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  overflow: auto;
}

.agent-session-list__row {
  position: relative;
  border-radius: var(--sailor-radius-md);
}

.agent-session-list__row:hover,
.agent-session-list__row--active {
  background: #f4f7fb;
}

.agent-session-list__select {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr);
  gap: 3px;
  border: 0;
  background: transparent;
  padding: 8px 34px 8px 8px;
  text-align: left;
  cursor: pointer;
}

.agent-session-list__title {
  overflow: hidden;
  color: #111827;
  font-size: 11px;
  font-weight: var(--sailor-font-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-session-list__date {
  color: #98a2b3;
  font-size: 10px;
}

.agent-session-list__delete {
  position: absolute;
  top: 50%;
  right: 6px;
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  border-radius: var(--sailor-radius-full);
  background: transparent;
  color: #98a2b3;
  cursor: pointer;
  transform: translateY(-50%);
}

.agent-session-list__delete:hover {
  background: #e8eef8;
  color: #0b1220;
}

.agent-session-list__delete-menu {
  border: 1px solid rgba(12, 17, 29, 0.08);
  border-radius: var(--sailor-radius-lg);
  background: #ffffff;
  padding: var(--sailor-space-3);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.14);
}

.agent-session-list__delete-menu h3 {
  margin: 0 0 var(--sailor-space-2);
  color: #0b1220;
  font-size: var(--sailor-text-sm);
}

.agent-session-list__delete-menu label {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  margin-top: var(--sailor-space-2);
  color: #475467;
  font-size: var(--sailor-text-xs);
}

.agent-session-list__confirm {
  color: var(--sailor-text-error);
}

.agent-session-list__delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sailor-space-2);
  margin-top: var(--sailor-space-3);
}
</style>
