<template><div class="editor-stack">
  <EditorField label="Step Name"><BaseInput :model-value="String(node.data.name || '')" @update:model-value="updateNodeData({ name: $event })" placeholder="Basic LLM Chain" /></EditorField>
  <EditorField label="Prompt"><ExpressionTextarea :model-value="String(node.data.prompt || '')" @update:model-value="updateNodeData({ prompt: $event })" /></EditorField>
  <EditorField label="Input"><ExpressionTextarea :model-value="String(node.data.input || '')" @update:model-value="updateNodeData({ input: $event })" /></EditorField>
</div></template>
<script setup lang="ts">import type { NodeEditorProps } from './types'; import EditorField from './EditorField.vue'; import BaseInput from '@/shared/components/base/BaseInput.vue'; import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'; defineProps<NodeEditorProps>()</script>
