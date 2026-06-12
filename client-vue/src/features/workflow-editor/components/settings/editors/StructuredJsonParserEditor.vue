<template><div class="editor-stack">
  <EditorField label="Step Name"><BaseInput :model-value="String(node.data.name || '')" @update:model-value="updateNodeData({ name: $event })" placeholder="Structured JSON Parser" /></EditorField>
  <EditorField label="JSON Schema"><BaseCodeEditor :model-value="schemaText" language="json" height="240px" @update:model-value="updateSchema" /></EditorField>
  <EditorField label="Strict Validation"><BaseSwitch :model-value="node.data.strict !== false" @update:model-value="updateNodeData({ strict: $event })" /></EditorField>
</div></template>
<script setup lang="ts">
import { computed } from 'vue'; import type { NodeEditorProps } from './types'; import EditorField from './EditorField.vue'; import BaseInput from '@/shared/components/base/BaseInput.vue'; import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'; import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
const props = defineProps<NodeEditorProps>(); const schemaText = computed(() => JSON.stringify(props.node.data.schema ?? { type: 'object' }, null, 2)); function updateSchema(value: string) { try { props.updateNodeData({ schema: JSON.parse(value) }) } catch { /* Keep the last valid schema while editing. */ } }
</script>
