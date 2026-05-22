<template>
  <div class="editor-stack">
    <NodeEditorSection
      title="JSON Transform"
      eyebrow="Data shaping"
      description="Create a JSON value from params, previous output, response, body, headers and status."
    >
      <BaseInput
        :model-value="String(node?.data.outputName ?? '')"
        label="Output name"
        placeholder="payload"
        @update:model-value="updateNodeData({ outputName: String($event) || undefined })"
      />
      <PluginCreatorExpressionInput
        :model-value="expression"
        label="Expression"
        placeholder="({ id: body.id, name: params.name })"
        @update:model-value="updateNodeData({ expression: String($event) })"
      />
      <div class="json-transform-node-editor__quick">
        <button class="te-method-btn" type="button" @click="updateNodeData({ expression: 'previous' })">previous</button>
        <button class="te-method-btn" type="button" @click="updateNodeData({ expression: 'body' })">body</button>
        <button class="te-method-btn" type="button" @click="updateNodeData({ expression: '({ ...previous })' })">
          object copy
        </button>
      </div>
    </NodeEditorSection>

    <NodeEditorSection
      title="Live preview"
      description="No eval. This is the generated expression shape."
    >
      <pre class="json-transform-node-editor__preview">{{ preview }}</pre>
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import PluginCreatorExpressionInput from '../expressions/PluginCreatorExpressionInput.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { node, updateNodeData } = usePluginCreatorNodeEditorContext(props, emit)

const expression = computed(() => String(node.value?.data.expression ?? 'previous'))
const preview = computed(() =>
  JSON.stringify(
    {
      outputName: String(node.value?.data.outputName ?? node.value?.id ?? 'transform_output'),
      expression: expression.value,
      available: ['params', 'credentials', 'previous', 'response', 'body', 'headers', 'status'],
    },
    null,
    2,
  ),
)
</script>

<style scoped>
.json-transform-node-editor__quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.json-transform-node-editor__preview {
  min-height: 120px;
  margin: 0;
  padding: 10px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: color-mix(in srgb, var(--sailor-bg-surface) 64%, transparent);
  color: var(--sailor-text-secondary);
  overflow: auto;
}
</style>
