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

    <button
      v-for="session in store.sessions"
      :key="session.id"
      type="button"
      class="agent-session-list__row"
      :class="{ 'agent-session-list__row--active': session.id === store.selectedSessionId }"
      @click="store.selectSession(session.id)"
    >
      <span class="agent-session-list__title">{{ session.title }}</span>
      <span class="agent-session-list__date">{{ formatSessionDate(session.updatedAt) }}</span>
      <button
        type="button"
        class="agent-session-list__delete"
        @click.stop="store.deleteSession(session.id)"
      >
        <LucideIcon name="trash-2" :size="14" />
      </button>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'

const store = useAgentPanelStore()
const selectedAgentName = computed(() => store.selectedAgent?.name ?? 'No agent selected')

function formatSessionDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}
</script>

<style scoped>
.agent-session-list {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  background: #fbfcfe;
}

.agent-session-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.agent-session-list__header h2 {
  margin: 0;
  color: #111827;
  font-size: 16px;
  font-weight: 700;
}

.agent-session-list__header p {
  overflow: hidden;
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-session-list__new,
.agent-session-list__delete {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
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
  color: #64748b;
  font-size: 13px;
}

.agent-session-list__row {
  position: relative;
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 10px;
  border: 0;
  border-left: 3px solid transparent;
  background: transparent;
  padding: 12px 44px 12px 15px;
  text-align: left;
  cursor: pointer;
}

.agent-session-list__row:hover,
.agent-session-list__row--active {
  border-left-color: #0ea5e9;
  background: #f0f9ff;
}

.agent-session-list__title {
  overflow: hidden;
  color: #111827;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-session-list__date {
  color: #94a3b8;
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
</style>
