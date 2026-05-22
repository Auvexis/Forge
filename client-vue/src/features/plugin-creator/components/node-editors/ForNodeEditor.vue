<template>
  <div class="node-editor-stack">
    <NodeEditorSection
      title="For"
      eyebrow="Loop"
      description="Run the body branch over a numeric range or iterable expression."
    >
      <div class="for-node-editor__mode" role="group" aria-label="Loop mode">
        <button type="button" :class="{ active: mode === 'range' }" @click="setMode('range')">
          range
        </button>
        <button type="button" :class="{ active: mode === 'iterable' }" @click="setMode('iterable')">
          iterable
        </button>
      </div>

      <BaseInput
        :model-value="itemVariable"
        label="Item variable"
        placeholder="index"
        :error="itemVariableError"
        @update:model-value="updateNodeData({ itemVariable: normalizeVariable(String($event)) })"
      />

      <div v-if="mode === 'range'" class="for-node-editor__grid">
        <PluginCreatorExpressionInput
          :model-value="String(node?.data.fromExpression ?? '0')"
          label="From expression"
          placeholder="0"
          @update:model-value="updateNodeData({ fromExpression: String($event) })"
        />
        <PluginCreatorExpressionInput
          :model-value="String(node?.data.toExpression ?? '0')"
          label="To expression"
          placeholder="10"
          @update:model-value="updateNodeData({ toExpression: String($event) })"
        />
      </div>

      <PluginCreatorExpressionInput
        v-else
        :model-value="String(node?.data.iterableExpression ?? 'previous')"
        label="Iterable expression"
        placeholder="params.items"
        @update:model-value="updateNodeData({ iterableExpression: String($event) })"
      />
    </NodeEditorSection>

    <NodeEditorSection
      title="Body branch"
      description="Connect loop body steps from the canvas handle."
    >
      <div class="for-node-editor__branch">
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

type ForMode = 'range' | 'iterable'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { node, updateNodeData } = usePluginCreatorNodeEditorContext(props, emit)

const mode = computed<ForMode>(() => (node.value?.data.iterableExpression ? 'iterable' : 'range'))
const itemVariable = computed(() => String(node.value?.data.itemVariable ?? 'index'))
const itemVariableError = computed(() =>
  itemVariable.value.trim() ? '' : 'Item variable is required',
)

function setMode(nextMode: ForMode) {
  if (nextMode === 'range') {
    updateNodeData({ iterableExpression: undefined, fromExpression: '0', toExpression: '0' })
    return
  }
  updateNodeData({
    iterableExpression: 'previous',
    fromExpression: undefined,
    toExpression: undefined,
  })
}

function normalizeVariable(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_$]/g, '')
}
</script>

<style scoped>
.node-editor-stack {
  display: flex;
  flex-direction: column;
}

.for-node-editor__mode,
.for-node-editor__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.for-node-editor__mode button {
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  padding: 7px 8px;
}

.for-node-editor__mode button.active {
  border-color: var(--sailor-border-strong);
  background: var(--sailor-bg-muted);
}

.for-node-editor__branch {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
}

.for-node-editor__branch span {
  color: var(--sailor-text-muted);
  font-size: 12px;
}
</style>
