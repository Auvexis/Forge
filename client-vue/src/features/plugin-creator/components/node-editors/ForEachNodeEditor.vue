<template>
  <div class="node-editor-stack">
    <NodeEditorSection
      title="ForEach"
      eyebrow="Loop"
      description="Run the body branch once for each item in an array expression."
    >
      <PluginCreatorExpressionInput
        :model-value="String(node?.data.arrayExpression ?? 'previous')"
        label="Array expression"
        placeholder="params.items"
        @update:model-value="updateNodeData({ arrayExpression: String($event) })"
      />
      <BaseInput
        :model-value="itemVariable"
        label="Item variable"
        placeholder="item"
        :error="itemVariableError"
        @update:model-value="updateNodeData({ itemVariable: normalizeVariable(String($event)) })"
      />
    </NodeEditorSection>

    <NodeEditorSection
      title="Body branch"
      description="Connect loop body steps from the canvas handle."
    >
      <div class="for-each-node-editor__branch">
        <strong>Body branch</strong>
        <span>Handle: body</span>
      </div>
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

const itemVariable = computed(() => String(node.value?.data.itemVariable ?? 'item'))
const itemVariableError = computed(() =>
  itemVariable.value.trim() ? '' : 'Item variable is required',
)

function normalizeVariable(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_$]/g, '')
}
</script>

<style scoped>
.node-editor-stack {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.for-each-node-editor__branch {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
  row-gap: 2px;
  padding: 2px 0;
}

.for-each-node-editor__branch::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: var(--sailor-radius-full);
  background: rgb(34, 197, 94);
  grid-row: span 2;
}

.for-each-node-editor__branch span {
  color: var(--sailor-text-muted);
  font-size: 12px;
}
</style>
