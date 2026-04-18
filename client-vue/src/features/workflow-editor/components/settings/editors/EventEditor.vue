<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <input
        class="editor-input editor-input--bold"
        :value="node.data.name || ''"
        @input="updateNodeData({ name: ($event.target as HTMLInputElement).value })"
        placeholder="Emit event"
      />
    </EditorField>

    <EditorField label="Event Topic" icon="zap">
      <input
        class="editor-input editor-input--mono"
        :value="node.data.eventTopic || ''"
        @input="updateNodeData({ eventTopic: ($event.target as HTMLInputElement).value })"
        placeholder="user.created"
      />
    </EditorField>

    <EditorField label="Event Payload">
      <textarea
        class="editor-textarea"
        :value="node.data.payload || ''"
        @input="updateNodeData({ payload: ($event.target as HTMLTextAreaElement).value })"
        placeholder='{ "userId": "{{ steps.create_user.output.id }}" }'
        spellcheck="false"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'

defineProps<NodeEditorProps>()
</script>

<style scoped>

</style>
