<template>
  <div class="editor-stack">
    <NodeEditorSection title="Step Name">
      <BaseInput
        :model-value="String(node?.data.name ?? node?.data.label ?? '')"
        placeholder="Loop / ForEach"
        @update:model-value="updateNodeData({ name: String($event), label: String($event) })"
      />
    </NodeEditorSection>

    <NodeEditorSection
      title="Collection Path"
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
        <BaseBadge variant="success" size="sm" text="Body branch" />
        <BaseBadge variant="outline" size="sm" text="body" />
      </div>
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
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
.for-each-node-editor__branch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
</style>
