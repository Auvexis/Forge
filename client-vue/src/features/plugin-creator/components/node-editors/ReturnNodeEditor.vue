<template>
  <div class="editor-stack">
    <NodeEditorSection
      title="Return"
      eyebrow="Method exit"
      description="Stop execution and send this expression as the final method output."
    >
      <PluginCreatorExpressionInput
        :model-value="valueExpression"
        label="Value expression"
        placeholder="previous"
        @update:model-value="updateNodeData({ valueExpression: String($event) })"
      />
      <div class="return-node-editor__quick">
        <button class="te-method-btn" type="button" @click="updateNodeData({ valueExpression: 'previous' })">
          previous
        </button>
        <button class="te-method-btn" type="button" @click="updateNodeData({ valueExpression: 'params' })">params</button>
        <button class="te-method-btn" type="button" @click="updateNodeData({ valueExpression: '({ ...previous })' })">
          object literal
        </button>
      </div>
    </NodeEditorSection>

    <NodeEditorSection
      title="Final output preview"
      description="Expression that will be returned by the method."
    >
      <pre class="return-node-editor__preview">return {{ valueExpression }};</pre>
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PluginCreatorExpressionInput from '../expressions/PluginCreatorExpressionInput.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { node, updateNodeData } = usePluginCreatorNodeEditorContext(props, emit)

const valueExpression = computed(() => String(node.value?.data.valueExpression ?? 'previous'))
</script>

<style scoped>
.return-node-editor__quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.return-node-editor__preview {
  min-height: 74px;
  margin: 0;
  padding: 10px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: color-mix(in srgb, var(--sailor-bg-surface) 64%, transparent);
  color: var(--sailor-text-secondary);
  overflow: auto;
}
</style>
