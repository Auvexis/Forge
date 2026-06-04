<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="AI Agent"
      />
    </EditorField>

    <EditorField label="Agent Emoji">
      <ProfileAvatarPicker
        :model-value="(node.data.agentEmoji as string) || '🤖'"
        @update:model-value="updateNodeData({ agentEmoji: $event })"
      />
    </EditorField>

    <EditorField label="Public Agent Name">
      <BaseInput
        :model-value="(node.data.agentDisplayName as string) || (node.data.name as string) || ''"
        placeholder="Support Agent"
        @update:model-value="updateNodeData({ agentDisplayName: ($event as string) || undefined })"
      />
    </EditorField>

    <EditorField label="System Prompt">
      <ExpressionTextarea
        :model-value="(node.data.prompt as string) || ''"
        @update:model-value="updateNodeData({ prompt: $event as string })"
        placeholder="You are a helpful workflow agent. Use tools only when needed."
      />
    </EditorField>

    <EditorField label="User Input">
      <ExpressionTextarea
        :model-value="(node.data.inputMessage as string) || ''"
        @update:model-value="updateNodeData({ inputMessage: ($event as string) || undefined })"
        placeholder="Enter your input here..."
      />
    </EditorField>

    <EditorField label="Execution Mode">
      <BaseSelect
        :model-value="(node.data.executionMode as string) || 'loop'"
        :options="EXECUTION_MODES"
        @update:model-value="updateNodeData({ executionMode: $event as string })"
      />
    </EditorField>

    <EditorField label="Execution Limits">
      <div class="editor-limit-stack">
        <label class="editor-limit-field">
          <span>Max Iterations</span>
          <BaseInput
            type="number"
            :model-value="Number(node.data.maxIterations ?? 8)"
            @update:model-value="updateNodeData({ maxIterations: Number($event) })"
          />
        </label>
        <label class="editor-limit-field">
          <span>Max Tool Calls</span>
          <BaseInput
            type="number"
            :model-value="Number(node.data.maxToolCalls ?? 12)"
            @update:model-value="updateNodeData({ maxToolCalls: Number($event) })"
          />
        </label>
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

  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import ProfileAvatarPicker from '@/features/profiles/components/ProfileAvatarPicker.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'

defineProps<NodeEditorProps>()

const OUTPUT_MODES = [
  { value: 'text', label: 'Text' },
  { value: 'json', label: 'JSON' },
]

const EXECUTION_MODES = [
  { value: 'loop', label: 'Loop' },
  { value: 'plan', label: 'Plan' },
]

</script>

<style scoped>
.editor-limit-stack,
.editor-limit-field {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.editor-limit-field > span {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}
</style>
