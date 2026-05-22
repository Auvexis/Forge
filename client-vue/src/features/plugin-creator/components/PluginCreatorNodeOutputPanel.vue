<template>
  <section class="plugin-creator-node-output-panel" aria-label="Plugin Creator Node Output">
    <header>
      <strong>Node output</strong>
      <span>{{ selectedNodeId ?? 'No node selected' }}</span>
    </header>
    <pre v-if="selectedState?.error" class="plugin-creator-node-output-panel__error">{{ selectedState?.error }}</pre>
    <pre v-else>{{ JSON.stringify(selectedState?.output ?? null, null, 2) }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { PluginCreatorNodeExecutionState } from '../stores/pluginCreatorExecution.store.ts'

const props = defineProps<{
  selectedNodeId?: string | null
  nodeStatuses: Record<string, PluginCreatorNodeExecutionState>
}>()

const selectedState = computed(() =>
  props.selectedNodeId ? props.nodeStatuses[props.selectedNodeId] : null,
)
</script>

<style scoped>
.plugin-creator-node-output-panel {
  display: grid;
  gap: 8px;
  min-width: 260px;
}

.plugin-creator-node-output-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--sailor-text-secondary);
  font-size: 12px;
}

.plugin-creator-node-output-panel strong {
  color: var(--sailor-text-primary);
}

.plugin-creator-node-output-panel pre {
  max-height: 150px;
  margin: 0;
  padding: 9px;
  overflow: auto;
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  font-size: 12px;
  line-height: 1.45;
}

.plugin-creator-node-output-panel__error {
  color: #fecaca;
}
</style>
