<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Default Data Loader"
      />
    </EditorField>

    <EditorField label="Type of Data">
      <BaseSelect
        :model-value="(node.data.dataType as string) || 'json'"
        :options="DATA_TYPES"
        @update:model-value="updateNodeData({ dataType: $event as string })"
      />
    </EditorField>

    <EditorField label="Mode">
      <BaseSelect
        :model-value="(node.data.dataMode as string) || 'all'"
        :options="DATA_MODES"
        @update:model-value="updateNodeData({ dataMode: $event as string })"
      />
    </EditorField>

    <EditorField label="Data Path">
      <BaseInput
        :model-value="(node.data.dataPath as string) || ''"
        @update:model-value="updateNodeData({ dataPath: $event as string })"
        placeholder="courses"
      />
    </EditorField>

    <EditorField label="Text Template">
      <ExpressionTextarea
        :model-value="(node.data.textTemplate as string) || ''"
        @update:model-value="updateNodeData({ textTemplate: $event })"
        placeholder="title: {{ item.title }}"
        spellcheck="false"
      />
    </EditorField>

    <EditorField label="Metadata Template">
      <BaseCodeEditor
        :model-value="metadataTemplateText"
        language="json"
        height="160px"
        @update:model-value="updateMetadataTemplate"
      />
    </EditorField>

    <EditorField label="Source Metadata">
      <BaseSwitch
        :model-value="node.data.includeSourceMetadata !== false"
        label="Include filename, mime type, row index, and JSON path"
        @update:model-value="updateNodeData({ includeSourceMetadata: $event as boolean })"
      />
    </EditorField>

    <EditorField label="Root Context">
      <BaseSwitch
        :model-value="Boolean(node.data.includeRootFieldsAsContext)"
        label="Include root JSON fields outside the selected array"
        @update:model-value="updateNodeData({ includeRootFieldsAsContext: $event as boolean })"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'

const props = defineProps<NodeEditorProps>()

const metadataTemplateText = computed(() => JSON.stringify(props.node.data.metadataTemplate ?? {}, null, 2))

function updateMetadataTemplate(value: string) {
  try {
    props.updateNodeData({ metadataTemplate: JSON.parse(value || '{}') })
  } catch {
    // Keep the last valid template while the user is editing JSON.
  }
}

const DATA_TYPES = [
  { value: 'json', label: 'JSON' },
  { value: 'file', label: 'Binary/File' },
  { value: 'text', label: 'Text' },
]

const DATA_MODES = [
  { value: 'all', label: 'Load All Input Data' },
  { value: 'specific', label: 'Load Specific Data' },
]
</script>
