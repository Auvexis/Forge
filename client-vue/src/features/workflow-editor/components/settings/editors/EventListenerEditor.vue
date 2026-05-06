<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Wait for event"
      />
    </EditorField>

    <EditorField label="Event Topic" icon="target">
      <BaseInput
        :model-value="(node.data.eventTopic as string) || ''"
        @update:model-value="updateNodeData({ eventTopic: $event as string })"
        placeholder="user.created"
        style="font-family: var(--nod8-font-mono)"
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
import BaseInput from '@/shared/components/base/BaseInput.vue'

defineProps<NodeEditorProps>()
</script>

<style scoped>
.mt-2 {
  margin-top: var(--nod8-space-2);
}
</style>
