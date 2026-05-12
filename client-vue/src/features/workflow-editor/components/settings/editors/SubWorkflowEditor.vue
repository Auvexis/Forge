<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Call another flow"
      />
    </EditorField>

    <EditorField label="Target Workflow ID" icon="layers">
      <ExpressionInput
        :model-value="(node.data.targetWorkflowId as string) || ''"
        @update:model-value="updateNodeData({ targetWorkflowId: $event as string })"
        placeholder="wf_abc123"
        style="font-family: var(--nod8-font-mono)"
      />
    </EditorField>
    
    <div class="editor-hint editor-hint--blue mt-2">
      This step will invoke the specified workflow and wait for its completion. The output of the sub-workflow will be available as the output of this step.
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
  margin-top: var(--nod8-space-2);
}
</style>
