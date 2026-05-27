<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="AI Model"
      />
    </EditorField>

    <EditorField label="Provider Plugin">
      <BaseInput
        :model-value="(node.data.pluginId as string) || ''"
        disabled
        placeholder="Selected provider plugin"
      />
    </EditorField>

    <EditorField label="Adapter">
      <BaseInput
        :model-value="(node.data.adapter as string) || 'openai-compatible'"
        disabled
        placeholder="openai-compatible"
      />
    </EditorField>

    <EditorField label="Model">
      <BaseInput
        :model-value="(node.data.model as string) || ''"
        @update:model-value="updateNodeData({ model: $event as string })"
        placeholder="gpt-4.1-mini"
      />
    </EditorField>

    <EditorField label="Generation">
      <div class="editor-grid">
        <BaseInput
          type="number"
          :model-value="Number(node.data.temperature ?? 0.2)"
          @update:model-value="updateNodeData({ temperature: Number($event) })"
          placeholder="Temperature"
        />
        <BaseInput
          type="number"
          :model-value="Number(node.data.maxTokens ?? 0)"
          @update:model-value="updateNodeData({ maxTokens: Number($event) || undefined })"
          placeholder="Max tokens"
        />
      </div>
    </EditorField>

    <EditorField label="Base URL">
      <BaseInput
        :model-value="(node.data.baseUrl as string) || ''"
        @update:model-value="updateNodeData({ baseUrl: ($event as string) || undefined })"
        placeholder="https://api.example.com/v1"
      />
    </EditorField>

    <EditorField label="Credential">
      <BaseInput
        :model-value="(node.data.credentialId as string) || ''"
        @update:model-value="updateNodeData({ credentialId: ($event as string) || undefined })"
        placeholder="Credential selector"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'

defineProps<NodeEditorProps>()

</script>

<style scoped>
.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--sailor-space-2);
}
</style>
