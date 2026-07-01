<template><div class="editor-stack">
  <EditorField label="Step Name"><BaseInput :model-value="String(node.data.name || '')" @update:model-value="updateNodeData({ name: $event })" placeholder="Question and Answer Chain" /></EditorField>
  <EditorField label="Question"><ExpressionTextarea :model-value="String(node.data.question || '')" @update:model-value="updateNodeData({ question: $event })" /></EditorField>
  <EditorField label="Instructions"><ExpressionTextarea :model-value="String(node.data.instructions || '')" @update:model-value="updateNodeData({ instructions: $event || undefined })" /></EditorField>
</div></template>
<script setup lang="ts">import type { NodeEditorProps } from './types'; import EditorField from './EditorField.vue'; import BaseInput from '@/shared/components/base/BaseInput.vue'; import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'; defineProps<NodeEditorProps>()</script>
