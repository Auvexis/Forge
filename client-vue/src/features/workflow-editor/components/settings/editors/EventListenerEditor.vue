<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <input
        class="editor-input editor-input--bold"
        :value="node.data.name || ''"
        @input="updateNodeData({ name: ($event.target as HTMLInputElement).value })"
        placeholder="Wait for event"
      />
    </EditorField>

    <EditorField label="Event Topic" icon="target">
      <input
        class="editor-input editor-input--mono"
        :value="node.data.eventTopic || ''"
        @input="updateNodeData({ eventTopic: ($event.target as HTMLInputElement).value })"
        placeholder="user.created"
      />
    </EditorField>

    <div class="editor-hint editor-hint--amber mt-2">
      This step will pause the workflow execution until an event matching the specified topic is emitted.
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
