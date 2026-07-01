<template><div class="editor-stack">
  <EditorField label="Step Name"><BaseInput :model-value="String(node.data.name || '')" @update:model-value="updateNodeData({ name: $event })" placeholder="Vector Store Retriever" /></EditorField>
  <EditorField label="Top K"><BaseInput type="number" :model-value="String(node.data.topK ?? 5)" @update:model-value="updateNodeData({ topK: Number($event) || 5 })" /></EditorField>
  <EditorField label="Score Threshold"><BaseInput type="number" :model-value="String(node.data.scoreThreshold ?? '')" @update:model-value="updateNodeData({ scoreThreshold: $event ? Number($event) : undefined })" /></EditorField>
  <EditorField label="Max Context Chars"><BaseInput type="number" :model-value="String(node.data.maxContextChars ?? 8000)" @update:model-value="updateNodeData({ maxContextChars: Number($event) || 8000 })" /></EditorField>
  <EditorField label="Filter"><BaseCodeEditor :model-value="filterText" language="json" height="180px" @update:model-value="updateFilter" /></EditorField>
</div></template>
<script setup lang="ts">
import { computed } from 'vue'; import type { NodeEditorProps } from './types'; import EditorField from './EditorField.vue'; import BaseInput from '@/shared/components/base/BaseInput.vue'; import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
const props = defineProps<NodeEditorProps>(); const filterText = computed(() => JSON.stringify(props.node.data.filter ?? {}, null, 2)); function updateFilter(value: string) { try { props.updateNodeData({ filter: JSON.parse(value) }) } catch { /* Keep the last valid filter while editing. */ } }
</script>
