<template><div class="editor-stack">
  <EditorField label="Step Name"><BaseInput :model-value="String(node.data.name || '')" @update:model-value="updateNodeData({ name: $event })" placeholder="Vector Store Tool" /></EditorField>
  <EditorField label="Tool Name"><BaseInput :model-value="String(node.data.toolName || '')" @update:model-value="updateNodeData({ toolName: $event })" placeholder="search_documents" /></EditorField>
  <EditorField label="Description"><ExpressionTextarea :model-value="String(node.data.description || '')" @update:model-value="updateNodeData({ description: $event })" /></EditorField>
  <EditorField label="Top K"><BaseInput type="number" :model-value="String(node.data.topK ?? 5)" @update:model-value="updateNodeData({ topK: Number($event) || 5 })" /></EditorField>
  <EditorField label="Score Threshold"><BaseInput type="number" :model-value="String(node.data.scoreThreshold ?? '')" @update:model-value="updateNodeData({ scoreThreshold: $event ? Number($event) : undefined })" /></EditorField>
  <EditorField label="Instructions"><ExpressionTextarea :model-value="String(node.data.instructions || '')" @update:model-value="updateNodeData({ instructions: $event || undefined })" /></EditorField>
</div></template>
<script setup lang="ts">import type { NodeEditorProps } from './types'; import EditorField from './EditorField.vue'; import BaseInput from '@/shared/components/base/BaseInput.vue'; import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'; defineProps<NodeEditorProps>()</script>
