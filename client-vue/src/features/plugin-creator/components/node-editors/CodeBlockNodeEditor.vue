<template>
  <div class="editor-stack">
    <NodeEditorSection
      title="Code Block"
      eyebrow="TypeScript"
      description="Run safe code with access to params, previous and credentials context."
    >
      <div class="node-editor-grid node-editor-grid--2">
        <BaseInput
          :model-value="codeBlock.name"
          label="Name"
          placeholder="Shape response"
          @update:model-value="updateCodeBlock({ name: String($event) })"
        />
        <BaseInput
          :model-value="codeBlock.outputName ?? ''"
          label="Output variable"
          placeholder="shapedResponse"
          @update:model-value="updateCodeBlock({ outputName: String($event) || undefined })"
        />
      </div>
      <BaseCodeEditor
        :model-value="codeBlock.source"
        language="typescript"
        label="Source"
        height="260px"
        @update:model-value="updateCodeBlock({ source: String($event) })"
      />
    </NodeEditorSection>

    <NodeEditorSection
      title="Available Context"
      description="Common values available in this block."
    >
      <div class="node-editor-snippets">
        <BaseBadge variant="outline" size="sm" text="params" />
        <BaseBadge variant="outline" size="sm" text="previous" />
        <BaseBadge variant="outline" size="sm" text="context.credentials" />
      </div>
    </NodeEditorSection>

    <NodeEditorSection
      title="Blocked runtime access"
      description="Code blocks must stay portable and cannot import runtime modules."
    >
      <div class="node-editor-snippets">
        <BaseBadge variant="outline" size="sm" text="import" />
        <BaseBadge variant="outline" size="sm" text="require" />
        <BaseBadge variant="outline" size="sm" text="process" />
        <BaseBadge variant="outline" size="sm" text="fs" />
        <BaseBadge variant="outline" size="sm" text="eval" />
        <BaseBadge variant="outline" size="sm" text="Function" />
      </div>
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginBlueprintCodeBlock } from '@/core/types/plugin-creator.types'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { node, method, updateMethodPatch, updateNodeData } = usePluginCreatorNodeEditorContext(
  props,
  emit,
)

const codeBlock = computed<PluginBlueprintCodeBlock>(() => {
  const id = String(node.value?.data.codeBlockId ?? node.value?.id ?? 'code_block')
  return (
    method.value?.codeBlocks?.find((candidate) => candidate.id === id) ?? {
      id,
      name: String(node.value?.data.name ?? node.value?.data.label ?? 'Code Block'),
      source: String(node.value?.data.source ?? 'return previous;'),
      outputName:
        typeof node.value?.data.outputName === 'string' ? node.value.data.outputName : undefined,
    }
  )
})

function updateCodeBlock(payload: Partial<PluginBlueprintCodeBlock>) {
  if (!method.value) return
  const nextBlock = { ...codeBlock.value, ...payload }
  const current = method.value.codeBlocks ?? []
  const exists = current.some((candidate) => candidate.id === nextBlock.id)
  updateMethodPatch({
    codeBlocks: exists
      ? current.map((candidate) => (candidate.id === nextBlock.id ? nextBlock : candidate))
      : [...current, nextBlock],
  })
  updateNodeData({
    codeBlockId: nextBlock.id,
    name: nextBlock.name,
    label: nextBlock.name,
    outputName: nextBlock.outputName,
    source: nextBlock.source,
  })
}

</script>

<style scoped>
.node-editor-grid {
  display: grid;
  gap: 12px;
}

.node-editor-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.node-editor-snippets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

</style>
