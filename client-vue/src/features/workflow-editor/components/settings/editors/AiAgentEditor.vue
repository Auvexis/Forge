<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="AI Agent"
      />
    </EditorField>

    <EditorField label="System Prompt">
      <ExpressionTextarea
        :model-value="(node.data.prompt as string) || ''"
        @update:model-value="updateNodeData({ prompt: $event as string })"
        placeholder="You are a helpful workflow agent. Use tools only when needed."
      />
    </EditorField>

    <EditorField label="Execution Limits">
      <div class="editor-grid">
        <BaseInput
          type="number"
          :model-value="Number(node.data.maxIterations ?? 8)"
          @update:model-value="updateNodeData({ maxIterations: Number($event) })"
          placeholder="Max iterations"
        />
        <BaseInput
          type="number"
          :model-value="Number(node.data.maxToolCalls ?? 12)"
          @update:model-value="updateNodeData({ maxToolCalls: Number($event) })"
          placeholder="Max tool calls"
        />
      </div>
    </EditorField>

    <EditorField label="Timeout">
      <BaseInput
        type="number"
        :model-value="Number(node.data.timeoutMs ?? 180000)"
        @update:model-value="updateNodeData({ timeoutMs: Number($event) })"
        placeholder="180000"
      />
    </EditorField>

    <EditorField label="Output Mode">
      <BaseSelect
        :model-value="(node.data.outputMode as string) || 'text'"
        :options="OUTPUT_MODES"
        @update:model-value="updateNodeData({ outputMode: $event as string })"
      />
    </EditorField>

    <EditorField label="Approval Policy">
      <div class="agent-policy-list">
        <button
          v-for="sideEffect in SIDE_EFFECTS"
          :key="sideEffect"
          type="button"
          class="agent-policy-chip"
          :class="{ 'agent-policy-chip--active': approvalPolicy.includes(sideEffect) }"
          @click="toggleApprovalPolicy(sideEffect)"
        >
          {{ sideEffect }}
        </button>
      </div>
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import type { AgentToolSideEffect } from '@/core/types/workflow.types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'

const props = defineProps<NodeEditorProps>()

const OUTPUT_MODES = [
  { value: 'text', label: 'Text' },
  { value: 'json', label: 'JSON' },
]

const SIDE_EFFECTS: AgentToolSideEffect[] = [
  'write',
  'delete',
  'external-message',
  'external-payment',
  'filesystem',
]

const approvalPolicy = computed<AgentToolSideEffect[]>(
  () => (props.node.data.requireApprovalForSideEffects as AgentToolSideEffect[]) ?? [],
)

function toggleApprovalPolicy(sideEffect: AgentToolSideEffect) {
  const next = approvalPolicy.value.includes(sideEffect)
    ? approvalPolicy.value.filter((item) => item !== sideEffect)
    : [...approvalPolicy.value, sideEffect]

  props.updateNodeData({ requireApprovalForSideEffects: next })
}
</script>

<style scoped>
.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--sailor-space-2);
}

.agent-policy-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sailor-space-2);
}

.agent-policy-chip {
  padding: 4px 8px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-muted);
  font: inherit;
  font-size: var(--sailor-text-xs);
  cursor: pointer;
}

.agent-policy-chip--active {
  color: var(--sailor-text-primary);
  border-color: var(--sailor-amber-400);
  background: rgba(245, 158, 11, 0.12);
}
</style>
