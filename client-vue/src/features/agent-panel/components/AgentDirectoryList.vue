<template>
  <aside class="agent-directory-list" aria-label="Published agents">
    <div class="agent-directory-list__brand" aria-hidden="true" />

    <div class="agent-directory-list__agents" aria-label="Agent list">
      <div v-if="store.loading" class="agent-directory-list__state">...</div>
      <div v-else-if="store.directoryError" class="agent-directory-list__state">!</div>
      <div
        v-for="agent in store.filteredAgents"
        :key="agent.key"
        class="agent-directory-list__hint-wrapper"
      >
        <BaseButton
          type="button"
          size="icon"
          variant="ghost"
          class="agent-directory-list__item"
          :class="{ 'agent-directory-list__item--active': agent.key === store.selectedAgentKey }"
          :aria-label="`${agent.name} - ${agent.workflowName}`"
          @click="store.selectAgent(agent.key)"
        >
          <span class="agent-directory-list__emoji">{{ agent.emoji }}</span>
        </BaseButton>
        <div class="agent-directory-list__hint surface" role="tooltip">
          <span class="agent-directory-list__hint-avatar">{{ agent.emoji }}</span>
          <strong>{{ agent.name }}</strong>
          <span>{{ agent.workflowName }}</span>
        </div>
      </div>
      <div v-if="!store.loading && !store.directoryError && !store.filteredAgents.length" class="agent-directory-list__state">
        0
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import BaseButton from '@/shared/components/base/BaseButton.vue'

const store = useAgentPanelStore()

onMounted(() => {
  if (!store.agents.length) void store.loadAgents()
})
</script>

<style scoped>
.agent-directory-list {
  position: relative;
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: var(--sailor-space-5);
  border-right: 1px solid var(--sailor-border);
  background: color-mix(in srgb, var(--sailor-bg-surface) 82%, var(--sailor-bg-base));
  padding: var(--sailor-space-4) var(--sailor-space-3);
}

.agent-directory-list__brand {
  width: 28px;
  height: 28px;
  border-radius: var(--sailor-radius-full);
  background: linear-gradient(180deg, var(--sailor-blue-400) 0%, var(--sailor-blue-500) 100%);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--sailor-blue-500) 24%, transparent);
}

.agent-directory-list__agents {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sailor-space-2);
  width: 100%;
}

.agent-directory-list__item {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: var(--sailor-radius-full);
}

.agent-directory-list__hint-wrapper {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
}

.agent-directory-list__item {
  color: var(--sailor-text-primary);
}

.agent-directory-list__item:hover,
.agent-directory-list__item--active {
  background: var(--sailor-button-primary-bg);
  color: var(--sailor-button-primary-text);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--sailor-bg-inverse) 18%, transparent);
}

.agent-directory-list__emoji {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-full);
  background: var(--sailor-bg-base);
  font-size: 17px;
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
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.agent-directory-list__hint {
  position: absolute;
  top: 50%;
  left: calc(100% + var(--sailor-space-3));
  z-index: var(--sailor-z-tooltip);
  display: grid;
  width: 210px;
  min-height: 126px;
  gap: var(--sailor-space-1);
  justify-items: center;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-lg);
  background: var(--sailor-bg-surface);
  padding: var(--sailor-space-3);
  color: var(--sailor-text-primary);
  box-shadow: var(--sailor-shadow-lg);
  opacity: 0;
  pointer-events: none;
  transform: translate(-8px, -50%);
  transition:
    opacity var(--sailor-duration-base) var(--sailor-ease-standard),
    transform var(--sailor-duration-base) var(--sailor-ease-standard);
}

.agent-directory-list__hint-wrapper:hover .agent-directory-list__hint,
.agent-directory-list__hint-wrapper:focus-within .agent-directory-list__hint {
  opacity: 1;
  transform: translate(0, -50%);
}

.agent-directory-list__hint-avatar {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-full);
  background: var(--sailor-bg-base);
  font-size: var(--sailor-text-2xl);
}

.agent-directory-list__hint strong {
  margin-top: var(--sailor-space-1);
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
}

.agent-directory-list__hint span:last-child {
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  text-align: center;
}
</style>
