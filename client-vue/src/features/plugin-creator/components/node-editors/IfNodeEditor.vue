<template>
  <div class="node-editor-stack">
    <NodeEditorSection
      title="If"
      eyebrow="Control flow"
      description="Route execution into a true or false branch."
    >
      <PluginCreatorExpressionInput
        :model-value="String(node?.data.condition ?? '')"
        label="Condition"
        placeholder="Boolean(previous?.id)"
        @update:model-value="updateNodeData({ condition: String($event) })"
      />
      <div class="if-node-editor__quick">
        <button type="button" @click="updateNodeData({ condition: 'Boolean(previous)' })">
          previous exists
        </button>
        <button type="button" @click="updateNodeData({ condition: 'params.enabled === true' })">
          enabled param
        </button>
        <button
          type="button"
          @click="updateNodeData({ condition: 'status >= 200 && status < 300' })"
        >
          success status
        </button>
      </div>
    </NodeEditorSection>

    <NodeEditorSection title="Branches" description="Connect branch handles from the canvas.">
      <div class="if-node-editor__branches">
        <div>
          <strong>True branch</strong>
          <span>Handle: then</span>
        </div>
        <div>
          <strong>False branch</strong>
          <span>Handle: else</span>
        </div>
      </div>
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import PluginCreatorExpressionInput from '../expressions/PluginCreatorExpressionInput.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { node, updateNodeData } = usePluginCreatorNodeEditorContext(props, emit)
</script>

<style scoped>
.node-editor-stack {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.if-node-editor__quick,
.if-node-editor__branches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.if-node-editor__quick button {
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  padding: 6px 8px;
}

.if-node-editor__branches > div {
  min-width: 150px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
  row-gap: 2px;
  padding: 2px 0;
}

.if-node-editor__branches > div::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: var(--sailor-radius-full);
  grid-row: span 2;
}

.if-node-editor__branches > div:first-child::before {
  background: rgb(34, 197, 94);
}

.if-node-editor__branches > div:last-child::before {
  background: rgb(239, 68, 68);
}

.if-node-editor__branches span {
  color: var(--sailor-text-muted);
  font-size: 12px;
}
</style>
