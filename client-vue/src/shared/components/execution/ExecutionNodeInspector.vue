<script setup lang="ts">
import type { ExecutionRunTreeNode } from './executionRunTree.types.ts'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{ node: ExecutionRunTreeNode | null }>()

function formatJson(value: unknown) {
  if (value === undefined) return 'No data.'
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}
</script>

<template>
  <section class="execution-node-inspector">
    <div v-if="!node" class="execution-node-inspector__empty">Select a step.</div>
    <template v-else>
      <header class="execution-node-inspector__header">
        <LucideIcon :name="node.icon" :size="26" :style="{ color: node.iconColor }" />
        <div>
          <h3>{{ node.name }}</h3>
          <p>{{ node.status }}<template v-if="node.durationMs !== null"> · {{ node.durationMs }}ms</template> · {{ node.nodeId }}</p>
        </div>
      </header>
      <details class="execution-node-inspector__section" open>
        <summary>Input</summary>
        <pre>{{ formatJson(node.input) }}</pre>
      </details>
      <details class="execution-node-inspector__section" open>
        <summary>{{ node.error ? 'Error' : 'Output' }}</summary>
        <pre>{{ node.error || formatJson(node.output) }}</pre>
      </details>
      <details v-if="node.retries?.length" class="execution-node-inspector__section">
        <summary>Retries · {{ node.retries.length }}</summary>
        <pre>{{ formatJson(node.retries) }}</pre>
      </details>
    </template>
  </section>
</template>

<style scoped>
.execution-node-inspector { height: 100%; min-height: 0; overflow: auto; padding: var(--sailor-space-4); background-color: var(--sailor-bg-surface); }
.execution-node-inspector__empty { height: 100%; display: grid; place-items: center; color: var(--sailor-text-muted); font-size: var(--sailor-text-sm); }
.execution-node-inspector__header { display: flex; align-items: center; gap: var(--sailor-space-3); margin-bottom: var(--sailor-space-4); }
.execution-node-inspector__header h3 { margin: 0; color: var(--sailor-text-primary); font-size: var(--sailor-text-base); font-weight: var(--sailor-font-semibold); }
.execution-node-inspector__header p { margin: 3px 0 0; color: var(--sailor-text-muted); font-size: var(--sailor-text-xs); }
.execution-node-inspector__section { margin-top: var(--sailor-space-3); border: 1px solid var(--sailor-border); border-radius: var(--sailor-radius-sm); background-color: var(--sailor-bg-base); }
.execution-node-inspector__section summary { padding: var(--sailor-space-3); color: var(--sailor-text-secondary); font-size: var(--sailor-text-xs); font-weight: var(--sailor-font-semibold); cursor: pointer; }
.execution-node-inspector__section pre { max-height: 240px; margin: 0; overflow: auto; padding: var(--sailor-space-3); border-top: 1px solid var(--sailor-border-muted); color: var(--sailor-text-secondary); font-family: var(--sailor-font-mono); font-size: var(--sailor-text-xs); line-height: 1.5; white-space: pre-wrap; }
</style>
