<template>
  <aside class="agent-directory-list" aria-label="Published agents">
    <header class="agent-directory-list__header">
      <div>
        <h2>Agents</h2>
        <p>{{ store.agents.length }} published</p>
      </div>
      <button type="button" class="agent-directory-list__refresh" @click="store.loadAgents()">
        <LucideIcon name="refresh-cw" :size="16" />
      </button>
    </header>

    <div v-if="store.loading" class="agent-directory-list__state">Loading agents...</div>
    <div v-else-if="store.error" class="agent-directory-list__state agent-directory-list__state--error">
      {{ store.error }}
    </div>
    <div v-else-if="!store.agents.length" class="agent-directory-list__state">
      No published agents.
    </div>

    <button
      v-for="agent in store.agents"
      :key="agent.key"
      type="button"
      class="agent-directory-list__item"
      :class="{ 'agent-directory-list__item--active': agent.key === store.selectedAgentKey }"
      @click="store.selectAgent(agent.key)"
    >
      <span class="agent-directory-list__emoji">{{ agent.emoji }}</span>
      <span class="agent-directory-list__copy">
        <strong>{{ agent.name }}</strong>
        <span>{{ agent.workflowName }}</span>
        <small>{{ agent.profileId }}</small>
      </span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'

const store = useAgentPanelStore()

onMounted(() => {
  if (!store.agents.length) void store.loadAgents()
})
</script>

<style scoped>
.agent-directory-list {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
}

.agent-directory-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.agent-directory-list__header h2 {
  margin: 0;
  color: #111827;
  font-size: 16px;
  font-weight: 700;
}

.agent-directory-list__header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.agent-directory-list__refresh {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
}

.agent-directory-list__state {
  padding: 18px;
  color: #64748b;
  font-size: 13px;
}

.agent-directory-list__state--error {
  color: #b91c1c;
}

.agent-directory-list__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  border: 0;
  border-left: 3px solid transparent;
  background: transparent;
  padding: 12px 15px;
  text-align: left;
  cursor: pointer;
}

.agent-directory-list__item:hover,
.agent-directory-list__item--active {
  border-left-color: #f59e0b;
  background: #fff7ed;
}

.agent-directory-list__emoji {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 22px;
}

.agent-directory-list__copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.agent-directory-list__copy strong,
.agent-directory-list__copy span,
.agent-directory-list__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-directory-list__copy strong {
  color: #111827;
  font-size: 14px;
}

.agent-directory-list__copy span {
  color: #475569;
  font-size: 12px;
}

.agent-directory-list__copy small {
  color: #94a3b8;
  font-size: 11px;
}
</style>
