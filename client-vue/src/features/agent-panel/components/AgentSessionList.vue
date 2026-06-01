<template>
  <aside class="agent-session-list" aria-label="Agent chat sessions">
    <header class="agent-session-list__header">
      <h2>Chat</h2>
      <div class="agent-session-list__search-shell" :class="{ 'agent-session-list__search-shell--open': searchOpen }">
        <BaseButton
          title="Search chats"
          size="icon"
          icon-left="search"
          variant="ghost"
          @click="searchOpen = !searchOpen"
        />
        <BaseInput
          v-model="sessionSearch"
          class="agent-session-list__search"
          icon-left="search"
          placeholder="Search chats"
          aria-label="Search chats"
        />
      </div>
    </header>

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

    <div class="agent-session-list__saved">Saved</div>

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
        <BaseButton type="button" class="agent-session-list__select" variant="ghost" @click="store.selectSession(session.id)">
          <span class="agent-session-list__title">{{ session.title }}</span>
          <span class="agent-session-list__date">{{ formatSessionDate(session.updatedAt) }}</span>
        </BaseButton>
        <BaseButton
          type="button"
          size="icon"
          variant="ghost"
          class="agent-session-list__delete"
          title="Delete chat"
          icon-left="ellipsis"
          @click="openDeleteMenu(session.id)"
        />
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
  border-right: 1px solid var(--sailor-border);
  background: var(--sailor-bg-surface);
  padding: var(--sailor-space-5) var(--sailor-space-4);
}

.agent-session-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-2);
}

.agent-session-list__header h2 {
  margin: 0;
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
  font-weight: var(--sailor-font-semibold);
}

.agent-session-list__header :deep(.base-button) {
  width: 28px;
  height: 28px;
  color: var(--sailor-text-secondary);
}

.agent-session-list__search-shell {
  display: grid;
  width: 28px;
  grid-template-columns: 28px 0fr;
  align-items: center;
  justify-content: end;
  gap: var(--sailor-space-2);
  overflow: hidden;
  transition:
    width var(--sailor-duration-slow) var(--sailor-ease-standard),
    grid-template-columns var(--sailor-duration-slow) var(--sailor-ease-standard);
}

.agent-session-list__search-shell--open {
  width: min(150px, 100%);
  grid-template-columns: 28px 1fr;
}

.agent-session-list__search {
  min-width: 0;
  opacity: 0;
  transition: opacity var(--sailor-duration-base) var(--sailor-ease-standard);
}

.agent-session-list__search-shell--open .agent-session-list__search {
  opacity: 1;
}

.agent-session-list__search :deep(.base-input-container) {
  height: 28px;
}

.agent-session-list__new {
  display: inline-flex;
  width: 100%;
  min-width: 0;
  height: 36px;
  justify-content: center;
  border-color: var(--sailor-button-primary-border);
  border-radius: var(--sailor-radius-full);
  background: var(--sailor-button-primary-bg);
  color: var(--sailor-button-primary-text);
  font-size: var(--sailor-text-xs);
  white-space: nowrap;
  box-shadow: var(--sailor-shadow-sm);
}

.agent-session-list__saved {
  border-top: 1px solid var(--sailor-border);
  padding-top: var(--sailor-space-4);
  color: var(--sailor-text-muted);
  font-size: 11px;
}

.agent-session-list__state {
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  line-height: 1.4;
}

.agent-session-list__rows {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--sailor-space-1);
  overflow: auto;
}

.agent-session-list__row {
  position: relative;
  border-radius: var(--sailor-radius-md);
}

.agent-session-list__row:hover,
.agent-session-list__row--active {
  background: var(--sailor-button-ghost-hover);
}

.agent-session-list__select {
  display: grid;
  width: 100%;
  height: auto;
  justify-content: stretch;
  grid-template-columns: minmax(0, 1fr);
  gap: 3px;
  padding: 9px 34px 9px 10px;
  text-align: left;
}

.agent-session-list__select :deep(.base-button__label) {
  display: grid;
  width: 100%;
  min-width: 0;
  justify-items: start;
  gap: 3px;
}

.agent-session-list__title {
  overflow: hidden;
  color: var(--sailor-text-primary);
  font-size: 12px;
  font-weight: var(--sailor-font-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-session-list__date {
  color: var(--sailor-text-muted);
  font-size: 11px;
}

.agent-session-list__delete {
  position: absolute;
  top: 50%;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: var(--sailor-radius-full);
  color: var(--sailor-text-muted);
  transform: translateY(-50%);
}

.agent-session-list__delete:hover {
  background: var(--sailor-button-ghost-hover);
  color: var(--sailor-text-primary);
}

.agent-session-list__delete-menu {
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-lg);
  background: var(--sailor-bg-surface);
  padding: var(--sailor-space-3);
  box-shadow: var(--sailor-shadow-lg);
}

.agent-session-list__delete-menu h3 {
  margin: 0 0 var(--sailor-space-2);
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
}

.agent-session-list__delete-menu label {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  margin-top: var(--sailor-space-2);
  color: var(--sailor-text-secondary);
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
