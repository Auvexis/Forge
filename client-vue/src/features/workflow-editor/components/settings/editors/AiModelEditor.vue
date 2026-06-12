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

    <EditorField label="Temperature">
      <BaseInput
        type="number"
        :model-value="Number(node.data.temperature ?? 0.2)"
        @update:model-value="updateNodeData({ temperature: Number($event) })"
        placeholder="0.2"
      />
    </EditorField>

    <EditorField label="Max Tokens">
      <BaseInput
        type="number"
        :model-value="Number(node.data.maxTokens ?? 0)"
        @update:model-value="updateNodeData({ maxTokens: Number($event) || undefined })"
        placeholder="Optional"
      />
    </EditorField>

    <EditorField label="Thinking">
      <BaseSwitch
        :model-value="Boolean(node.data.thinkingEnabled)"
        :disabled="node.data.thinkingSupported === false"
        label="Show model thinking when the provider streams it"
        @update:model-value="updateNodeData({ thinkingEnabled: $event as boolean })"
      />
    </EditorField>

    <EditorField label="Base URL">
      <BaseInput
        :model-value="(node.data.baseUrl as string) || ''"
        @update:model-value="updateNodeData({ baseUrl: ($event as string) || undefined })"
        placeholder="https://api.example.com/v1"
      />
    </EditorField>

  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'

defineProps<NodeEditorProps>()

</script>
