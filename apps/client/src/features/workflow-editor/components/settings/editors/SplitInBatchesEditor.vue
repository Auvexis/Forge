<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Name this step"
      />
    </EditorField>

    <EditorField label="Collection Expression" icon="layers">
      <div class="editor-hint editor-hint--violet">
        JS expression resolving to an <span class="editor-code-snippet">array</span> in context.
        Example: <span class="editor-code-snippet">trigger.body.items</span> or
        <span class="editor-code-snippet">steps.fetch.output.results</span>
      </div>
      <ExpressionTextarea
        :model-value="(node.data.collection as string) || ''"
        @update:model-value="updateNodeData({ collection: $event })"
        placeholder="trigger.body.items"
        spellcheck="false"
      />
    </EditorField>

    <EditorField label="Batch Size" icon="list">
      <div class="editor-hint">Number of items per batch. Must be ≥ 1.</div>
      <BaseInput
        type="number"
        :model-value="String(node.data.batchSize ?? 10)"
        @update:model-value="updateNodeData({ batchSize: Number($event) })"
        placeholder="10"
      />
    </EditorField>

    <EditorField label="Max Batches (optional)" icon="shield">
      <div class="editor-hint">Safety cap. Defaults to 100 if not set.</div>
      <BaseInput
        type="number"
        :model-value="String(node.data.maxBatches ?? '')"
        @update:model-value="updateNodeData({ maxBatches: $event ? Number($event) : undefined })"
        placeholder="100"
      />
    </EditorField>

    <EditorField>
      <div class="split-handles-info">
        <span class="editor-field__label">Output Handles</span>
        <div class="split-handles mt-2">
          <div class="split-handle-item">
            <div class="split-handle-text">
              <span class="split-handle-name">batch</span>
              <span class="split-handle-desc">Executes once per batch. Use <code>variables.$batch</code>, <code>$batchIndex</code>, <code>$batchTotal</code></span>
            </div>
          </div>
          <div class="split-handle-item">
            <div class="split-handle-text">
              <span class="split-handle-name">done</span>
              <span class="split-handle-desc">Fires once after all batches complete</span>
            </div>
          </div>
        </div>
      </div>
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'

defineProps<NodeEditorProps>()
</script>

<style scoped>
.split-handles-info {
  padding: var(--fabric-space-3);
  border-radius: var(--fabric-radius-lg);
  background-color: var(--fabric-split-in-batches-editor-bg-surface);
  border: 1px solid var(--fabric-split-in-batches-editor-border);
}

.split-handles {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-3);
}

.split-handle-item {
  display: flex;
  align-items: flex-start;
  gap: var(--fabric-space-2);
}

.split-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 3px;
  flex-shrink: 0;
}

.split-dot--batch { background-color: var(--fabric-node-split-icon, #f59e0b); }
.split-dot--done  { background-color: var(--fabric-split-in-batches-editor-green400); }

.split-handle-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.split-handle-name {
  font-size: var(--fabric-text-sm);
  font-weight: 500;
  font-family: var(--fabric-font-mono);
  color: var(--fabric-split-in-batches-editor-accent);
}

.split-handle-desc {
  font-size: 11px;
  color: var(--fabric-split-in-batches-editor-text-muted);
}

code {
  font-family: var(--fabric-font-mono);
  font-size: 10px;
  font-weight: 500;
  color: var(--fabric-split-in-batches-editor-accent);
}
</style>
