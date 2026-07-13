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

function hasData(value: unknown) {
  return value !== undefined && value !== null
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
      <details v-if="node.kind !== 'error'" class="execution-node-inspector__section" :open="hasData(node.input)">
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
      <details v-if="node.error" class="execution-node-inspector__section execution-node-inspector__section--error" open>
        <summary>Error</summary>
        <pre>{{ node.error }}</pre>
      </details>
      <details v-else-if="node.kind !== 'error'" class="execution-node-inspector__section" :open="hasData(node.output)">
        <summary>Output</summary>
        <div v-if="previewState(`${node.nodeId}:output`, node.output).skipped" class="execution-node-inspector__guard">
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
.execution-node-inspector { height: 100%; min-height: 0; overflow: auto; padding: var(--fabric-space-4); background-color: var(--fabric-bg-surface); }
.execution-node-inspector__empty { height: 100%; display: grid; place-items: center; color: var(--fabric-text-muted); font-size: var(--fabric-text-sm); }
.execution-node-inspector__header { display: flex; align-items: center; gap: var(--fabric-space-3); margin-bottom: var(--fabric-space-4); }
.execution-node-inspector__avatar { display: grid; width: 26px; height: 26px; flex: 0 0 auto; place-items: center; font-size: 24px; line-height: 1; }
.execution-node-inspector__header h3 { margin: 0; color: var(--fabric-text-primary); font-size: var(--fabric-text-base); font-weight: var(--fabric-font-semibold); }
.execution-node-inspector__header p { margin: 3px 0 0; color: var(--fabric-text-muted); font-size: var(--fabric-text-xs); }
.execution-node-inspector__section { margin-top: var(--fabric-space-3); border: 1px solid var(--fabric-border); border-radius: var(--fabric-radius-sm); background-color: var(--fabric-bg-base); }
.execution-node-inspector__section--error { border-color: var(--fabric-status-error-border); }
.execution-node-inspector__section summary { padding: var(--fabric-space-3); color: var(--fabric-text-secondary); font-size: var(--fabric-text-xs); font-weight: var(--fabric-font-semibold); cursor: pointer; }
.execution-node-inspector__section--error summary { color: var(--fabric-status-error-text); }
.execution-node-inspector__section pre { max-height: 240px; margin: 0; overflow: auto; padding: var(--fabric-space-3); border-top: 1px solid var(--fabric-border-muted); color: var(--fabric-text-secondary); font-family: var(--fabric-font-mono); font-size: var(--fabric-text-xs); line-height: 1.5; white-space: pre-wrap; }
.execution-node-inspector__guard { display: flex; align-items: center; justify-content: space-between; gap: var(--fabric-space-3); padding: var(--fabric-space-3); border-top: 1px solid var(--fabric-border-muted); color: var(--fabric-text-muted); font-size: var(--fabric-text-xs); }
</style>
