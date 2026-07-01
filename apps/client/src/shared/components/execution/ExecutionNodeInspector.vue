<script setup lang="ts">
import { ref } from 'vue'
import type { ExecutionRunTreeNode } from './executionRunTree.types.ts'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{ node: ExecutionRunTreeNode | null }>()
const forcedPreviews = ref(new Set<string>())
const MAX_EAGER_OUTPUT_PREVIEW_BYTES = 80_000
const MAX_EAGER_OUTPUT_ITEMS = 100

function formatJson(value: unknown) {
  if (value === undefined) return 'No data.'
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}

function previewState(key: string, value: unknown) {
  if (forcedPreviews.value.has(key)) return { skipped: false, summary: '' }
  const count = Array.isArray(value)
    ? value.length
    : value && typeof value === 'object'
      ? ['items', 'documents', 'rows'].map((field) => (value as Record<string, unknown>)[field]).find(Array.isArray)?.length
      : undefined
  if (count !== undefined && count > MAX_EAGER_OUTPUT_ITEMS) {
    return { skipped: true, summary: `Preview skipped for large output (${count} items).` }
  }
  const length = formatJson(value).length
  return length > MAX_EAGER_OUTPUT_PREVIEW_BYTES
    ? { skipped: true, summary: `Preview skipped for large output (${length.toLocaleString()} characters).` }
    : { skipped: false, summary: '' }
}

function showPreview(key: string) {
  forcedPreviews.value = new Set(forcedPreviews.value).add(key)
}
</script>

<template>
  <section class="execution-node-inspector">
    <div v-if="!node" class="execution-node-inspector__empty">Select a step.</div>
    <template v-else>
      <header class="execution-node-inspector__header">
        <span v-if="node.avatar" class="execution-node-inspector__avatar" aria-hidden="true">{{ node.avatar }}</span>
        <LucideIcon v-else :name="node.icon" :size="26" :style="{ color: node.iconColor }" />
        <div>
          <h3>{{ node.name }}</h3>
          <p>{{ node.status }}<template v-if="node.durationMs !== null"> · {{ node.durationMs }}ms</template> · {{ node.nodeId }}</p>
        </div>
      </header>
      <details class="execution-node-inspector__section" open>
        <summary>Input</summary>
        <div v-if="previewState(`${node.nodeId}:input`, node.input).skipped" class="execution-node-inspector__guard">
          <span>{{ previewState(`${node.nodeId}:input`, node.input).summary }}</span>
          <BaseButton size="sm" variant="outline" @click="showPreview(`${node.nodeId}:input`)">Show preview</BaseButton>
        </div>
        <BaseCodeEditor
          v-else
          :model-value="formatJson(node.input)"
          language="json"
          height="240px"
          readonly
        />
      </details>
      <details class="execution-node-inspector__section" open>
        <summary>{{ node.error ? 'Error' : 'Output' }}</summary>
        <pre v-if="node.error">{{ node.error }}</pre>
        <div v-else-if="previewState(`${node.nodeId}:output`, node.output).skipped" class="execution-node-inspector__guard">
          <span>{{ previewState(`${node.nodeId}:output`, node.output).summary }}</span>
          <BaseButton size="sm" variant="outline" @click="showPreview(`${node.nodeId}:output`)">Show preview</BaseButton>
        </div>
        <BaseCodeEditor
          v-else
          :model-value="formatJson(node.output)"
          language="json"
          height="240px"
          readonly
        />
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
.execution-node-inspector__avatar { display: grid; width: 26px; height: 26px; flex: 0 0 auto; place-items: center; font-size: 24px; line-height: 1; }
.execution-node-inspector__header h3 { margin: 0; color: var(--sailor-text-primary); font-size: var(--sailor-text-base); font-weight: var(--sailor-font-semibold); }
.execution-node-inspector__header p { margin: 3px 0 0; color: var(--sailor-text-muted); font-size: var(--sailor-text-xs); }
.execution-node-inspector__section { margin-top: var(--sailor-space-3); border: 1px solid var(--sailor-border); border-radius: var(--sailor-radius-sm); background-color: var(--sailor-bg-base); }
.execution-node-inspector__section summary { padding: var(--sailor-space-3); color: var(--sailor-text-secondary); font-size: var(--sailor-text-xs); font-weight: var(--sailor-font-semibold); cursor: pointer; }
.execution-node-inspector__section pre { max-height: 240px; margin: 0; overflow: auto; padding: var(--sailor-space-3); border-top: 1px solid var(--sailor-border-muted); color: var(--sailor-text-secondary); font-family: var(--sailor-font-mono); font-size: var(--sailor-text-xs); line-height: 1.5; white-space: pre-wrap; }
.execution-node-inspector__guard { display: flex; align-items: center; justify-content: space-between; gap: var(--sailor-space-3); padding: var(--sailor-space-3); border-top: 1px solid var(--sailor-border-muted); color: var(--sailor-text-muted); font-size: var(--sailor-text-xs); }
</style>
