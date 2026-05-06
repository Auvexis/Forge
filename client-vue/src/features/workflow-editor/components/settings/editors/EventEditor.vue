<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Emit event"
      />
    </EditorField>

    <EditorField label="Event Topic" icon="zap">
      <BaseInput
        :model-value="(node.data.eventTopic as string) || ''"
        @update:model-value="updateNodeData({ eventTopic: $event as string })"
        placeholder="user.created"
        style="font-family: var(--nod8-font-mono)"
      />
    </EditorField>

    <EditorField label="Event Payload">
      <BaseTextarea
        :model-value="(node.data.payload as string) || ''"
        @update:model-value="updateNodeData({ payload: $event })"
        placeholder='{ "userId": "{{ steps.create_user.output.id }}" }'
        spellcheck="false"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'

defineProps<NodeEditorProps>()
</script>

<style scoped></style>
