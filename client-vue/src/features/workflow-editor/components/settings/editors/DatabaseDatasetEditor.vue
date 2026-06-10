<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Database Dataset"
      />
    </EditorField>

    <EditorField label="Database Plugin">
      <BaseInput
        :model-value="(node.data.pluginId as string) || ''"
        @update:model-value="updateNodeData({ pluginId: $event as string })"
        placeholder="sailor-postgresql"
      />
    </EditorField>

    <EditorField label="Method">
      <BaseInput
        :model-value="(node.data.methodId as string) || ''"
        @update:model-value="updateNodeData({ methodId: $event as string })"
        placeholder="query"
      />
    </EditorField>

    <EditorField label="Query">
      <ExpressionTextarea
        :model-value="(node.data.query as string) || ''"
        @update:model-value="updateNodeData({ query: $event })"
        placeholder="select id, title, body from documents"
        spellcheck="false"
      />
    </EditorField>

    <EditorField label="Text Columns">
      <BaseInput
        :model-value="textColumns"
        @update:model-value="updateNodeData({ textColumns: splitColumns($event as string) })"
        placeholder="title, body"
      />
    </EditorField>

    <EditorField label="Metadata Columns">
      <BaseInput
        :model-value="metadataColumns"
        @update:model-value="updateNodeData({ metadataColumns: splitColumns($event as string) })"
        placeholder="id, source, created_at"
      />
    </EditorField>

    <EditorField label="Limit">
      <BaseInput
        type="number"
        :model-value="String(node.data.limit ?? '')"
        @update:model-value="updateNodeData({ limit: $event ? Number($event) : undefined })"
        placeholder="1000"
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
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'

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

const textColumns = computed(() => ((props.node.data.textColumns as string[] | undefined) ?? []).join(', '))
const metadataColumns = computed(() => ((props.node.data.metadataColumns as string[] | undefined) ?? []).join(', '))

function splitColumns(value: string): string[] {
  return value.split(',').map((column) => column.trim()).filter(Boolean)
}

function updateChunking(patch: Partial<DatasetChunkingConfig>) {
  props.updateNodeData({ chunking: { ...chunking.value, ...patch } })
}
</script>
