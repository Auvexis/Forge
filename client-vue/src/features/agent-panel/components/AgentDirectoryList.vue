<template>
  <aside class="agent-directory-list" aria-label="Published agents">
    <div class="agent-directory-list__brand" aria-hidden="true" />

    <div class="agent-directory-list__tools">
      <BaseButton
        title="Search agents"
        size="icon"
        icon-left="search"
        variant="ghost"
        @click="searchOpen = !searchOpen"
      />
      <BaseButton
        :title="store.agentScope === 'global' ? 'Showing global agents' : 'Showing profile agents'"
        size="icon"
        :icon-left="store.agentScope === 'global' ? 'globe-2' : 'user-round'"
        variant="ghost"
        @click="toggleScope"
      />
    </div>

    <div v-if="searchOpen" class="agent-directory-list__search">
      <BaseInput
        v-model="store.agentSearch"
        icon-left="search"
        placeholder="Search agents"
        aria-label="Search agents"
      />
    </div>

    <div class="agent-directory-list__agents" aria-label="Agent list">
      <div v-if="store.loading" class="agent-directory-list__state">...</div>
      <div v-else-if="store.directoryError" class="agent-directory-list__state">!</div>
      <button
        v-for="agent in store.filteredAgents"
        :key="agent.key"
        type="button"
        class="agent-directory-list__item"
        :class="{ 'agent-directory-list__item--active': agent.key === store.selectedAgentKey }"
        :title="`${agent.name} - ${agent.workflowName}`"
        @click="store.selectAgent(agent.key)"
      >
        <span class="agent-directory-list__emoji">{{ agent.emoji }}</span>
      </button>
      <div v-if="!store.loading && !store.directoryError && !store.filteredAgents.length" class="agent-directory-list__state">
        0
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'

const store = useAgentPanelStore()
const searchOpen = ref(false)

onMounted(() => {
  if (!store.agents.length) void store.loadAgents()
})

function toggleScope() {
  void store.setAgentScope(store.agentScope === 'global' ? 'current' : 'global')
}
</script>

<style scoped>
.agent-directory-list {
  position: relative;
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: var(--sailor-space-3);
  border-right: 1px solid rgba(12, 17, 29, 0.08);
  background: #fbfcff;
  padding: var(--sailor-space-4) var(--sailor-space-2);
}

.agent-directory-list__brand {
  width: 28px;
  height: 28px;
  border-radius: var(--sailor-radius-full);
  background: linear-gradient(180deg, #9bbdff 0%, #3869dc 100%);
  box-shadow: 0 8px 18px rgba(56, 105, 220, 0.24);
}

.agent-directory-list__tools,
.agent-directory-list__agents {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sailor-space-2);
  width: 100%;
}

.agent-directory-list__tools :deep(.base-button),
.agent-directory-list__item {
  width: 34px;
  height: 34px;
  border-radius: var(--sailor-radius-full);
}

.agent-directory-list__tools :deep(.base-button) {
  color: #526071;
}

.agent-directory-list__tools :deep(.base-button:hover) {
  background: #eef3ff;
  color: #0b1220;
}

.agent-directory-list__search {
  position: absolute;
  top: var(--sailor-space-12);
  left: calc(100% + var(--sailor-space-2));
  z-index: var(--sailor-z-dropdown);
  width: 220px;
  border: 1px solid rgba(12, 17, 29, 0.08);
  border-radius: var(--sailor-radius-lg);
  background: #ffffff;
  padding: var(--sailor-space-2);
  box-shadow: 0 16px 42px rgba(15, 23, 42, 0.12);
}

.agent-directory-list__item {
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.agent-directory-list__item:hover,
.agent-directory-list__item--active {
  background: #061025;
  box-shadow: 0 10px 24px rgba(6, 16, 37, 0.18);
}

.agent-directory-list__emoji {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid rgba(12, 17, 29, 0.08);
  border-radius: var(--sailor-radius-full);
  background: #ffffff;
  font-size: 15px;
}

.agent-directory-list__item--active .agent-directory-list__emoji,
.agent-directory-list__item:hover .agent-directory-list__emoji {
  border-color: transparent;
}

.agent-directory-list__state {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #98a2b3;
  font-size: var(--sailor-text-xs);
}
</style>
