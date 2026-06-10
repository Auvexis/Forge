<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="File Dataset"
      />
    </EditorField>

    <EditorField label="File Path">
      <BaseInput
        :model-value="(node.data.filePath as string) || ''"
        @update:model-value="updateNodeData({ filePath: ($event as string) || undefined })"
        placeholder="/data/docs/file.md"
      />
    </EditorField>

    <EditorField label="File URL">
      <BaseInput
        :model-value="(node.data.fileUrl as string) || ''"
        @update:model-value="updateNodeData({ fileUrl: ($event as string) || undefined })"
        placeholder="Uploaded file URL"
      />
    </EditorField>

    <EditorField label="Format">
      <BaseInput
        :model-value="(node.data.format as string) || 'txt'"
        @update:model-value="updateNodeData({ format: ($event as string) || 'txt' })"
        placeholder="txt, markdown, json, csv"
      />
    </EditorField>

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
import { computed } from 'vue'
import type { DatasetChunkingConfig } from '@/core/types/workflow.types'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'

const props = defineProps<NodeEditorProps>()

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

function updateChunking(patch: Partial<DatasetChunkingConfig>) {
  props.updateNodeData({ chunking: { ...chunking.value, ...patch } })
}
</script>
