<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <input
        class="editor-input editor-input--bold"
        :value="node.data.name || ''"
        @input="updateNodeData({ name: ($event.target as HTMLInputElement).value })"
        placeholder="Call another flow"
      />
    </EditorField>

    <EditorField label="Target Workflow ID" icon="layers">
      <input
        class="editor-input editor-input--mono"
        :value="node.data.targetWorkflowId || ''"
        @input="updateNodeData({ targetWorkflowId: ($event.target as HTMLInputElement).value })"
        placeholder="wf_abc123"
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

defineProps<NodeEditorProps>()
</script>

<style scoped>


.mt-2 {
  margin-top: var(--nod8-space-2);
}
</style>
