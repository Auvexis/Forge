<template>
  <aside
    class="agent-directory-list"
    :class="{ 'agent-directory-list--collapsed': store.directoryCollapsed }"
    aria-label="Published agents"
  >
    <header class="agent-directory-list__header">
      <div v-if="!store.directoryCollapsed">
        <h2>Agents</h2>
        <p>{{ store.filteredAgents.length }} {{ store.filteredAgents.length > 2 || store.filteredAgents.length == 0 ? 'Agents' : 'Agent' }}</p>
      </div>

      <div class="agent-directory-list__header-actions">
        <BaseButton
          :title="store.directoryCollapsed ? 'Expand agents' : 'Collapse agents'"
          :size="'icon'"
          :icon-left="store.directoryCollapsed ? 'panel-left-open' : 'panel-left-close'"
          :variant="'ghost'"
          @click="store.toggleDirectoryCollapsed()"
        />
        <BaseButton
          v-if="!store.directoryCollapsed"
          title="Refresh agents"
          :size="'icon'"
          :icon-left="'refresh-cw'"
          :variant="'ghost'"
          @click="store.loadAgents(store.agentScope)"
        />
      </div>
    </header>

    <div v-if="!store.directoryCollapsed" class="agent-directory-list__tools">
      <div class="agent-directory-list__scope" role="tablist" aria-label="Agent scope">
        <button
          type="button"
          :class="{ 'agent-directory-list__scope-button--active': store.agentScope === 'global' }"
          @click="store.setAgentScope('global')"
        >
          Global
        </button>
        <button
          type="button"
          :class="{ 'agent-directory-list__scope-button--active': store.agentScope === 'current' }"
          @click="store.setAgentScope('current')"
        >
          Perfil
        </button>
      </div>

      <BaseInput
        v-model="store.agentSearch"
        icon-left="search"
        placeholder="Search agents"
        aria-label="Search agents"
      />
    </div>

    <div v-if="store.loading" class="agent-directory-list__state">Loading agents...</div>
    <div v-else-if="store.directoryError" class="agent-directory-list__state agent-directory-list__state--error">
      {{ store.directoryError }}
    </div>
    <div v-else-if="!store.filteredAgents.length" class="agent-directory-list__state">
      {{ store.agentSearch.trim() ? 'No agents match this search.' : 'No published agents.' }}
    </div>

    <button
      v-for="agent in store.filteredAgents"
      :key="agent.key"
      type="button"
      class="agent-directory-list__item"
      :class="{ 'agent-directory-list__item--active': agent.key === store.selectedAgentKey }"
      :title="store.directoryCollapsed ? `${agent.name} - ${agent.workflowName}` : undefined"
      @click="store.selectAgent(agent.key)"
    >
      <span class="agent-directory-list__emoji">{{ agent.emoji }}</span>
      <span v-if="!store.directoryCollapsed" class="agent-directory-list__copy">
        <strong>{{ agent.name }}</strong>
        <span>{{ agent.workflowName }}</span>
        <small>{{ agent.profileId }}</small>
      </span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'

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
  border-right: 1px solid var(--sailor-border);
  background: var(--sailor-bg-surface);
  overflow: hidden;
  transition: width var(--sailor-duration-base) var(--sailor-ease-standard);
}

.agent-directory-list--collapsed {
  align-items: center;
}

.agent-directory-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-3);
  padding: var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border);
}

.agent-directory-list--collapsed .agent-directory-list__header {
  width: 100%;
  justify-content: center;
  padding: var(--sailor-space-2);
}

.agent-directory-list__header-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--sailor-space-1);
}

.agent-directory-list__header h2 {
  margin: 0;
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-base);
  font-weight: var(--sailor-font-bold);
}

.agent-directory-list__header p {
  margin: 4px 0 0;
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
}

.agent-directory-list__tools {
  display: grid;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-width: 0 0 1px;
}

.agent-directory-list__scope {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-elevated);
  padding: 2px;
}

.agent-directory-list__scope button {
  min-width: 0;
  border: 0;
  border-radius: calc(var(--sailor-radius-sm) - 2px);
  background: transparent;
  padding: var(--sailor-space-1) var(--sailor-space-2);
  color: var(--sailor-text-secondary);
  font: inherit;
  font-size: var(--sailor-text-xs);
  cursor: pointer;
}

.agent-directory-list__scope button:hover,
.agent-directory-list__scope-button--active {
  background: var(--sailor-button-ghost-hover);
  color: var(--sailor-text-primary);
}

.agent-directory-list__state {
  padding: var(--sailor-space-4);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
}

.agent-directory-list--collapsed .agent-directory-list__state {
  padding: var(--sailor-space-2);
  writing-mode: vertical-rl;
  text-align: center;
}

.agent-directory-list__state--error {
  color: var(--sailor-text-error);
}

.agent-directory-list__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--sailor-space-3);
  border: 0;
  border-left: 3px solid transparent;
  background: transparent;
  padding: var(--sailor-space-1) var(--sailor-space-2);
  text-align: left;
  cursor: pointer;
}

.agent-directory-list--collapsed .agent-directory-list__item {
  width: 100%;
  justify-content: center;
  border-left-width: 0;
  border-right: 3px solid transparent;
  padding: var(--sailor-space-2) 0;
}

.agent-directory-list__item:hover,
.agent-directory-list__item--active {
  border-left-color: var(--sailor-text-primary);
  background: var(--sailor-button-ghost-hover);
}

.agent-directory-list--collapsed .agent-directory-list__item:hover,
.agent-directory-list--collapsed .agent-directory-list__item--active {
  border-right-color: var(--sailor-text-primary);
  border-left-color: transparent;
}

.agent-directory-list__emoji {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-full);
  background: var(--sailor-bg-elevated);
  font-size: 22px;
}

.agent-directory-list--collapsed .agent-directory-list__emoji {
  width: 42px;
  height: 42px;
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
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
}

.agent-directory-list__copy span {
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
}

.agent-directory-list__copy small {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}
</style>
