<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Name this condition"
      />
    </EditorField>

    <EditorField label="Condition Expression" icon="git-branch">
      <div class="editor-hint editor-hint--violet">
        JS expression evaluated against
        <span class="editor-code-snippet">trigger</span>,
        <span class="editor-code-snippet">steps</span>,
        <span class="editor-code-snippet">variables</span>
      </div>
      <ExpressionTextarea
        :model-value="(node.data.condition as string) || ''"
        @update:model-value="updateNodeData({ condition: $event })"
        placeholder="steps.prevStep.output.status === 200"
        spellcheck="false"
      />
    </EditorField>

    <EditorField>
      <div class="editor-branches">
        <span class="editor-field__label">Output Branches</span>
        <div class="branches-legend mt-2">
          <div class="branch-item">
            <div class="branch-dot branch-dot--true"></div>
            <span class="branch-label branch-label--true">Then (true)</span>
          </div>
          <div class="branch-item">
            <div class="branch-dot branch-dot--false"></div>
            <span class="branch-label branch-label--false">Else (false)</span>
          </div>
        </div>
        <p class="editor-hint-text">
          Connect the green handle (top) for the "true" path and the red handle (bottom) for the
          "false" path.
        </p>
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
.editor-branches {
  padding: var(--sailor-space-3);
  border-radius: var(--sailor-radius-lg);
  background-color: var(--sailor-bg-surface);
  border: 1px solid var(--sailor-border);
}

.branches-legend {
  display: flex;
  gap: var(--sailor-space-3);
}

.branch-item {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
}

.branch-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.branch-dot--true {
  background-color: rgb(16, 185, 129);
}

.branch-dot--false {
  background-color: rgb(239, 68, 68);
}

.branch-label {
  font-size: var(--sailor-text-xs);
  font-weight: 700;
}

.branch-label--true {
  color: rgb(16, 185, 129);
}

.branch-label--false {
  color: rgb(239, 68, 68);
}

.editor-hint-text {
  font-size: 11px;
  color: var(--sailor-text-muted);
  font-style: italic;
  line-height: 1.5;
  margin-top: var(--sailor-space-2);
}
</style>
