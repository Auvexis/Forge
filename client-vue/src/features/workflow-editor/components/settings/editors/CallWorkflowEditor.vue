<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        placeholder="Call another workflow"
        @update:model-value="updateNodeData({ name: $event as string })"
      />
    </EditorField>

    <EditorField label="Target Workflow ID" icon="workflow">
      <ExpressionInput
        :model-value="(node.data.targetWorkflowId as string) || ''"
        placeholder="wf_abc123"
        style="font-family: var(--sailor-font-mono)"
        @update:model-value="updateNodeData({ targetWorkflowId: $event as string })"
      />
    </EditorField>

    <EditorField label="Target Trigger ID" icon="zap">
      <ExpressionInput
        :model-value="(node.data.targetTriggerId as string) || ''"
        placeholder="trigger"
        style="font-family: var(--sailor-font-mono)"
        @update:model-value="updateNodeData({ targetTriggerId: $event as string })"
      />
    </EditorField>

    <EditorField label="Tool Name" icon="wrench">
      <BaseInput
        :model-value="(node.data.toolName as string) || ''"
        placeholder="call_customer_lookup"
        @update:model-value="updateNodeData({ toolName: $event as string })"
      />
    </EditorField>

    <div class="editor-hint editor-hint--blue mt-2">
      This step invokes a published workflow through a callable trigger and returns its result.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'

defineProps<NodeEditorProps>()
</script>

<style scoped>
.mt-2 {
  margin-top: var(--sailor-space-2);
}
</style>
