<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Extract From File"
      />
    </EditorField>

    <EditorField label="Files">
      <FileDatasetFilesInput
        :model-value="files"
        @update:model-value="updateNodeData({ files: $event })"
      />
    </EditorField>

    <EditorField label="Format">
      <BaseSelect
        :model-value="(node.data.format as string) || 'txt'"
        :options="FORMAT_OPTIONS"
        @update:model-value="updateNodeData({ format: ($event as string) || 'txt' })"
      />
    </EditorField>

    <template v-if="showJsonControls">
      <EditorField label="JSON Mode">
        <BaseSelect
          :model-value="(node.data.jsonMode as string) || 'all'"
          :options="JSON_MODE_OPTIONS"
          @update:model-value="updateNodeData({ jsonMode: $event as string })"
        />
      </EditorField>

      <EditorField v-if="jsonPathOptions.length" label="Detected JSON Arrays">
        <BaseSelect
          :model-value="(node.data.jsonPath as string) || jsonPathOptions[0]?.value || ''"
          :options="jsonPathOptions"
          placeholder="Select array"
          @update:model-value="updateNodeData({ jsonMode: 'specific', jsonPath: $event as string })"
        />
      </EditorField>

      <EditorField v-if="jsonMode === 'specific'" label="JSON Path">
        <BaseInput
          :model-value="(node.data.jsonPath as string) || ''"
          @update:model-value="updateNodeData({ jsonPath: $event as string })"
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
            @click="regenerateTemplate"
          >
            Regenerate from JSON
          </BaseButton>
        </div>
      </EditorField>

      <EditorField label="Root Context">
        <BaseSwitch
          :model-value="Boolean(node.data.includeRootFieldsAsContext)"
          label="Include root JSON fields outside the selected array"
          @update:model-value="updateNodeData({ includeRootFieldsAsContext: $event as boolean })"
        />
      </EditorField>
    </template>

    <EditorField label="Chunking">
      <BaseSwitch
        :model-value="chunking.enabled"
        label="Split dataset items into chunks"
        @update:model-value="updateChunking({ enabled: $event as boolean })"
      />
    </EditorField>

    <EditorField label="Chunk Size">
      <BaseInput
        type="number"
        :model-value="String(chunking.chunkSize)"
        @update:model-value="updateChunking({ chunkSize: Number($event) || 1000 })"
        placeholder="1000"
      />
    </EditorField>

    <EditorField label="Chunk Overlap">
      <BaseInput
        type="number"
        :model-value="String(chunking.chunkOverlap)"
        @update:model-value="updateChunking({ chunkOverlap: Number($event) || 0 })"
        placeholder="120"
      />
    </EditorField>

    <EditorField label="Context Overlap">
      <BaseSwitch
        :model-value="chunking.contextualOverlapEnabled"
        label="Carry previous chunk context into the current chunk"
        @update:model-value="updateChunking({ contextualOverlapEnabled: $event as boolean })"
      />
    </EditorField>

    <EditorField label="Previous Context Chars">
      <BaseInput
        type="number"
        :model-value="String(chunking.maxPreviousContextChars ?? '')"
        @update:model-value="updateChunking({ maxPreviousContextChars: $event ? Number($event) : undefined })"
        placeholder="300"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { DatasetChunkingConfig, FileDatasetFile } from '@/core/types/workflow.types'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import FileDatasetFilesInput from './FileDatasetFilesInput.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import {
  buildFileDatasetTemplateSuggestion,
  buildJsonArrayPathOptions,
} from './fileDatasetTemplateSuggestions'

const props = defineProps<NodeEditorProps>()

const FORMAT_OPTIONS = [
  { value: 'auto', label: 'Auto detect' },
  { value: 'txt', label: 'Text' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
]

const JSON_MODE_OPTIONS = [
  { value: 'all', label: 'Load All Input Data' },
  { value: 'specific', label: 'Load Specific Data' },
]

const files = computed<FileDatasetFile[]>(() => {
  const configured = props.node.data.files as FileDatasetFile[] | undefined
  if (configured?.length) return configured

  const legacy = [props.node.data.filePath, props.node.data.fileUrl]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
  return legacy.length ? legacy : ['']
})

const defaultChunking: DatasetChunkingConfig = {
  enabled: false,
  chunkSize: 1000,
  chunkOverlap: 120,
  contextualOverlapEnabled: false,
  maxPreviousContextChars: 300,
}

const chunking = computed<DatasetChunkingConfig>(() => ({
  ...defaultChunking,
  ...((props.node.data.chunking as Partial<DatasetChunkingConfig> | undefined) ?? {}),
}))

const format = computed(() => (props.node.data.format as string | undefined) || 'txt')
const jsonMode = computed(() => (props.node.data.jsonMode as string | undefined) || 'all')
const showJsonControls = computed(() => format.value === 'auto' || format.value === 'json')
const jsonPath = computed(() => (props.node.data.jsonPath as string | undefined) || '')
const jsonPathOptions = computed(() => buildJsonArrayPathOptions(files.value))
const templateSuggestion = computed(() => buildFileDatasetTemplateSuggestion(
  files.value,
  jsonMode.value === 'specific' ? jsonPath.value : undefined,
))

watch(jsonPathOptions, (options) => {
  if (!showJsonControls.value || jsonMode.value !== 'specific') return
  if (jsonPath.value || !options[0]) return
  props.updateNodeData({ jsonPath: options[0].value })
}, { immediate: true })

watch(templateSuggestion, (suggestion) => {
  if (!showJsonControls.value || !suggestion) return
  if ((props.node.data.textTemplate as string | undefined)?.trim()) return
  props.updateNodeData({ textTemplate: suggestion.textTemplate })
}, { immediate: true })

function regenerateTemplate() {
  const suggestion = templateSuggestion.value
  if (!suggestion) return
  props.updateNodeData({ textTemplate: suggestion.textTemplate })
}

function updateChunking(patch: Partial<DatasetChunkingConfig>) {
  props.updateNodeData({ chunking: { ...chunking.value, ...patch } })
}
</script>

<style scoped>
.template-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--fabric-space-2);
}
</style>
