<template>
  <div class="editor-stack">
    <NodeEditorSection title="Step Name">
      <BaseInput
        :model-value="String(node?.data.name ?? node?.data.label ?? '')"
        placeholder="Loop / For"
        @update:model-value="updateNodeData({ name: String($event), label: String($event) })"
      />
    </NodeEditorSection>

    <NodeEditorSection
      title="Loop Mode"
      description="Run the body branch over a numeric range or iterable expression."
    >
      <div class="te-methods" role="group" aria-label="Loop mode">
        <button class="te-method-btn" type="button" :class="{ 'te-method-btn--active': mode === 'range' }" @click="setMode('range')">
          range
        </button>
        <button class="te-method-btn" type="button" :class="{ 'te-method-btn--active': mode === 'iterable' }" @click="setMode('iterable')">
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
          :show-hint="false"
          @update:model-value="updateNodeData({ fromExpression: String($event) })"
        />
        <PluginCreatorExpressionInput
          :model-value="String(node?.data.toExpression ?? '0')"
          label="To expression"
          placeholder="10"
          :show-hint="false"
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
.for-node-editor__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.for-node-editor__branch {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
  row-gap: 2px;
  padding: 2px 0;
}

.for-node-editor__branch::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: var(--sailor-radius-full);
  background: rgb(59, 130, 246);
  grid-row: span 2;
}

.for-node-editor__branch span {
  color: var(--sailor-text-muted);
  font-size: 12px;
}
</style>
