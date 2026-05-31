<template>
  <aside class="agent-session-list" aria-label="Agent chat sessions">
    <header class="agent-session-list__header">
      <div>
        <h2>Chats</h2>
        <p>{{ selectedAgentName }}</p>
      </div>
      <button
        type="button"
        class="agent-session-list__new"
        :disabled="!store.selectedAgentKey"
        @click="store.createSession()"
      >
        <LucideIcon name="plus" :size="16" />
      </button>
    </header>

    <div v-if="!store.selectedAgentKey" class="agent-session-list__state">Select an agent.</div>
    <div v-else-if="!store.sessions.length" class="agent-session-list__state">No chats yet.</div>

    <div
      v-for="session in store.sessions"
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
        @click="openDeleteMenu(session.id)"
      >
        <LucideIcon name="trash-2" :size="14" />
      </button>
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
        <button type="button" @click="closeDeleteMenu">Cancel</button>
        <button type="button" :disabled="deleteBlocked" @click="confirmDeleteSession">
          Delete
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'

const store = useAgentPanelStore()
const selectedAgentName = computed(() => store.selectedAgent?.name ?? 'No agent selected')
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
  border-right: 1px solid var(--sailor-border);
  background: var(--sailor-bg-surface);
}

.agent-session-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  border-bottom: 1px solid var(--sailor-border);
}

.agent-session-list__header h2 {
  margin: 0;
  color: var(--sailor-text-primary);
  font-size: 16px;
  font-weight: 700;
}

.agent-session-list__header p {
  overflow: hidden;
  margin: 4px 0 0;
  color: var(--sailor-text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-session-list__new,
.agent-session-list__delete {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--sailor-border);
  border-radius: 8px;
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-secondary);
  cursor: pointer;
}

.agent-session-list__new {
  width: 34px;
  height: 34px;
}

.agent-session-list__new:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.agent-session-list__state {
  padding: 18px;
  color: var(--sailor-text-secondary);
  font-size: 13px;
}

.agent-session-list__row {
  position: relative;
  border-left: 3px solid transparent;
  background: transparent;
}

.agent-session-list__row:hover,
.agent-session-list__row--active {
  border-left-color: var(--sailor-accent);
  background: var(--sailor-button-ghost-hover);
}

.agent-session-list__select {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 10px;
  border: 0;
  background: transparent;
  padding: 12px 44px 12px 12px;
  text-align: left;
  cursor: pointer;
}

.agent-session-list__title {
  overflow: hidden;
  color: var(--sailor-text-primary);
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-session-list__date {
  color: var(--sailor-text-muted);
  font-size: 12px;
}

.agent-session-list__delete {
  position: absolute;
  top: 50%;
  right: 12px;
  width: 28px;
  height: 28px;
  transform: translateY(-50%);
  opacity: 0;
}

.agent-session-list__row:hover .agent-session-list__delete,
.agent-session-list__delete:focus-visible {
  opacity: 1;
}

.agent-session-list__delete-menu {
  margin: auto 12px 12px;
  border: 1px solid var(--sailor-border);
  border-radius: 8px;
  background: var(--sailor-bg-elevated);
  padding: 12px;
  box-shadow: 0 18px 44px var(--sailor-border-strong);
}

.agent-session-list__delete-menu h3 {
  margin: 0 0 10px;
  color: var(--sailor-text-primary);
  font-size: 14px;
}

.agent-session-list__delete-menu label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: var(--sailor-text-secondary);
  font-size: 13px;
}

.agent-session-list__confirm {
  color: var(--sailor-text-error);
}

.agent-session-list__delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.agent-session-list__delete-actions button {
  border: 1px solid var(--sailor-border);
  border-radius: 8px;
  background: var(--sailor-bg-elevated);
  padding: 7px 10px;
  color: var(--sailor-text-secondary);
  font: inherit;
  cursor: pointer;
}

.agent-session-list__delete-actions button:last-child {
  border-color: var(--sailor-red-600);
  background: var(--sailor-red-600);
  color: var(--sailor-bg-elevated);
}

.agent-session-list__delete-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>

