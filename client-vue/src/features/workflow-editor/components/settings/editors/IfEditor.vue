<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <input
        class="editor-input editor-input--bold"
        :value="node.data.name || ''"
        @input="updateNodeData({ name: ($event.target as HTMLInputElement).value })"
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
      <textarea
        class="editor-textarea"
        style="min-height: 80px"
        :value="node.data.condition || ''"
        @input="updateNodeData({ condition: ($event.target as HTMLTextAreaElement).value })"
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

defineProps<NodeEditorProps>()
</script>

<style scoped>
.editor-branches {
  padding: var(--nod8-space-3);
  border-radius: var(--nod8-radius-lg);
  background-color: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
}

.branches-legend {
  display: flex;
  gap: var(--nod8-space-3);
}

.branch-item {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
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
  font-size: var(--nod8-text-xs);
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
  color: var(--nod8-text-muted);
  font-style: italic;
  line-height: 1.5;
  margin-top: var(--nod8-space-2);
}
</style>
