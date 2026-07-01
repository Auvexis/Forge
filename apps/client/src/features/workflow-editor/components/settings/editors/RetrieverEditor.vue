<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Retriever"
      />
    </EditorField>

    <EditorField label="Query">
      <ExpressionTextarea
        :model-value="(node.data.query as string) || ''"
        @update:model-value="updateNodeData({ query: $event })"
        placeholder="trigger.body.question"
        spellcheck="false"
      />
    </EditorField>

    <EditorField label="Top K">
      <div class="editor-hint">Must be greater than 0. Start small to keep context focused.</div>
      <BaseInput
        type="number"
        :model-value="String(node.data.topK ?? 5)"
        @update:model-value="updateNodeData({ topK: Number($event) || 5 })"
        placeholder="5"
      />
    </EditorField>

    <EditorField label="Score Threshold">
      <div class="editor-hint">Score threshold is optional. Use it to drop weak vector matches.</div>
      <BaseInput
        type="number"
        :model-value="String(node.data.scoreThreshold ?? '')"
        @update:model-value="updateNodeData({ scoreThreshold: $event ? Number($event) : undefined })"
        placeholder="0.75"
      />
    </EditorField>

    <EditorField label="Output Mode">
      <BaseInput
        :model-value="(node.data.outputMode as string) || 'context'"
        @update:model-value="updateNodeData({ outputMode: ($event as string) || 'context' })"
        placeholder="context or items"
      />
    </EditorField>

    <EditorField label="Max Context Chars">
      <BaseInput
        type="number"
        :model-value="String(node.data.maxContextChars ?? '')"
        @update:model-value="updateNodeData({ maxContextChars: $event ? Number($event) : undefined })"
        placeholder="8000"
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
