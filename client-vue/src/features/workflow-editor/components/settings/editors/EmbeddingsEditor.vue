<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Embeddings"
      />
    </EditorField>

    <EditorField label="Provider Plugin">
      <BaseInput
        :model-value="(node.data.pluginId as string) || ''"
        @update:model-value="updateNodeData({ pluginId: $event as string })"
        placeholder="sailor-openai"
      />
    </EditorField>

    <EditorField label="Method">
      <BaseInput
        :model-value="(node.data.methodId as string) || ''"
        @update:model-value="updateNodeData({ methodId: $event as string })"
        placeholder="create-embeddings"
      />
    </EditorField>

    <EditorField label="Model">
      <BaseInput
        :model-value="(node.data.model as string) || ''"
        @update:model-value="updateNodeData({ model: $event as string })"
        placeholder="text-embedding-3-small"
      />
    </EditorField>

    <EditorField label="Dimension">
      <BaseInput
        type="number"
        :model-value="String(node.data.dimension ?? '')"
        @update:model-value="updateNodeData({ dimension: $event ? Number($event) : undefined })"
        placeholder="1536"
      />
    </EditorField>

    <EditorField label="Input">
      <ExpressionTextarea
        :model-value="(node.data.input as string) || ''"
        @update:model-value="updateNodeData({ input: $event })"
        placeholder="steps.dataset.output.items"
        spellcheck="false"
      />
    </EditorField>

    <EditorField label="Batch Size">
      <BaseInput
        type="number"
        :model-value="String(node.data.batchSize ?? '')"
        @update:model-value="updateNodeData({ batchSize: $event ? Number($event) : undefined })"
        placeholder="64"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'

defineProps<NodeEditorProps>()
</script>
