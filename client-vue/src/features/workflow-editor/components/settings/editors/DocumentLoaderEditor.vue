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
      <div class="editor-hint">Path inside the incoming data, for example <code>courses</code> or <code>payload.items</code>. Upload files in Extract From File.</div>
      <BaseInput
        :model-value="(node.data.dataPath as string) || ''"
        @update:model-value="updateNodeData({ dataPath: $event as string })"
        placeholder="courses"
      />
    </EditorField>

    <EditorField label="Text Template">
      <BaseCodeEditor
        :model-value="(node.data.textTemplate as string) || ''"
        language="plaintext"
        height="220px"
        @update:model-value="updateNodeData({ textTemplate: $event })"
      />
      <div class="template-actions">
        <BaseButton
          variant="outline"
          size="sm"
          icon-left="refresh-cw"
          :disabled="!templateSuggestion"
          @click="regenerateTemplates"
        >
          Regenerate from Data Path
        </BaseButton>
      </div>
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
import { computed, watch } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import { useExecutionStore } from '../../../stores/execution.store'
import {
  buildDocumentLoaderTemplateSuggestion,
} from './documentLoaderTemplateSuggestions'

const props = defineProps<NodeEditorProps>()
const executionStore = useExecutionStore()

const metadataTemplateText = computed(() => JSON.stringify(props.node.data.metadataTemplate ?? {}, null, 2))
const dataPath = computed(() => (props.node.data.dataPath as string | undefined) || '')
const dataSourceNode = computed(() => {
  const directDataSourceId = props.edges.find(
    (edge) => edge.target === props.node.id && (!edge.targetHandle || edge.targetHandle === 'data'),
  )?.source
  return props.upstreamNodes.find((upNode) => upNode.id === directDataSourceId) ?? props.upstreamNodes.at(-1)
})
const upstreamOutput = computed(() => {
  const sourceId = dataSourceNode.value?.id
  return sourceId ? executionStore.nodeStatuses[sourceId]?.output : undefined
})
const templateSuggestion = computed(() => buildDocumentLoaderTemplateSuggestion(upstreamOutput.value, dataPath.value))
const currentMetadataTemplate = computed(() => {
  const raw = props.node.data.metadataTemplate
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
})

watch(templateSuggestion, (suggestion) => {
  if (!suggestion) return
  const patch: Record<string, unknown> = {}
  if (!(props.node.data.textTemplate as string | undefined)?.trim()) {
    patch.textTemplate = suggestion.textTemplate
  }
  if (Object.keys(currentMetadataTemplate.value).length === 0) {
    patch.metadataTemplate = suggestion.metadataTemplate
  }
  if (Object.keys(patch).length > 0) {
    props.updateNodeData(patch)
  }
}, { immediate: true })

function regenerateTemplates() {
  const suggestion = templateSuggestion.value
  if (!suggestion) return
  props.updateNodeData({
    textTemplate: suggestion.textTemplate,
    metadataTemplate: suggestion.metadataTemplate,
  })
}

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

<style scoped>
.template-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--sailor-space-2);
}
</style>
