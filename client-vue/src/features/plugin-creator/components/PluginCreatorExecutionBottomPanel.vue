<template>
  <aside v-if="hasExecution" class="plugin-creator-execution-bottom-panel">
    <section class="plugin-creator-execution-bottom-panel__timeline" aria-label="Execution timeline">
      <header>
        <strong>Execution</strong>
        <button type="button" @click="$emit('clear-execution')">Clear</button>
      </header>
      <ol>
        <li
          v-for="event in timeline"
          :key="event.id"
          :class="`is-${event.status}`"
        >
          <span>{{ event.label }}</span>
          <small>{{ event.timestamp }}</small>
        </li>
      </ol>
    </section>
    <PluginCreatorNodeOutputPanel
      :selected-node-id="selectedNodeId"
      :node-statuses="nodeStatuses"
    />
  </aside>
</template>

<script setup lang="ts">
import type {
  PluginCreatorNodeExecutionState,
  PluginCreatorTimelineEvent,
} from '../stores/pluginCreatorExecution.store.ts'
import PluginCreatorNodeOutputPanel from './PluginCreatorNodeOutputPanel.vue'

defineEmits<{
  'clear-execution': []
}>()

defineProps<{
  hasExecution: boolean
  selectedNodeId?: string | null
  timeline: PluginCreatorTimelineEvent[]
  nodeStatuses: Record<string, PluginCreatorNodeExecutionState>
}>()
</script>

<style scoped>
.plugin-creator-execution-bottom-panel {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  z-index: 35;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(260px, 0.8fr);
  gap: 12px;
  max-height: 230px;
  padding: 12px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 8px;
  background: color-mix(in srgb, var(--sailor-bg-base) 94%, transparent);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.32);
}

.plugin-creator-execution-bottom-panel__timeline {
  min-width: 0;
  display: grid;
  gap: 8px;
}

.plugin-creator-execution-bottom-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--sailor-text-primary);
  font-size: 12px;
}

.plugin-creator-execution-bottom-panel button {
  height: 26px;
  padding: 0 9px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.plugin-creator-execution-bottom-panel ol {
  display: grid;
  gap: 6px;
  max-height: 165px;
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.plugin-creator-execution-bottom-panel li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-secondary);
  font-size: 12px;
}

.plugin-creator-execution-bottom-panel li.is-success {
  color: #86efac;
}

.plugin-creator-execution-bottom-panel li.is-failed {
  color: #fecaca;
}

.plugin-creator-execution-bottom-panel li.is-running {
  color: #fcd34d;
}
</style>
