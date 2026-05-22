<template>
  <div class="editor-stack">
    <NodeEditorSection title="Step Name">
      <BaseInput
        :model-value="String(node?.data.name ?? node?.data.label ?? '')"
        placeholder="Name this condition"
        @update:model-value="updateNodeData({ name: String($event), label: String($event) })"
      />
    </NodeEditorSection>

    <NodeEditorSection
      title="Condition Expression"
      icon="git-branch"
      description="JS expression evaluated against params, credentials, previous, steps and response."
    >
      <div class="editor-hint editor-hint--violet">
        JS expression evaluated against
        <span class="editor-code-snippet">params</span>,
        <span class="editor-code-snippet">previous</span>,
        <span class="editor-code-snippet">steps</span>
      </div>
      <PluginCreatorExpressionInput
        :model-value="String(node?.data.condition ?? '')"
        label=""
        :show-hint="false"
        placeholder="Boolean(previous?.id)"
        @update:model-value="updateNodeData({ condition: String($event) })"
      />
      <div class="te-methods">
        <button class="te-method-btn" type="button" @click="updateNodeData({ condition: 'Boolean(previous)' })">
          previous exists
        </button>
        <button class="te-method-btn" type="button" @click="updateNodeData({ condition: 'params.enabled === true' })">
          enabled param
        </button>
        <button
          class="te-method-btn"
          type="button"
          @click="updateNodeData({ condition: 'status >= 200 && status < 300' })"
        >
          success status
        </button>
      </div>
    </NodeEditorSection>

    <NodeEditorSection title="Output Branches">
      <div class="editor-branches">
        <span class="editor-field__label">Output Branches</span>
        <div class="branches-legend">
          <div class="branch-item">
            <div class="branch-dot branch-dot--true"></div>
            <span class="branch-label branch-label--true">Then (true)</span>
          </div>
          <div class="branch-item">
            <div class="branch-dot branch-dot--false"></div>
            <span class="branch-label branch-label--false">Else (false)</span>
          </div>
        </div>
        <p class="editor-hint-text">
          Connect the green handle for the true path and the red handle for the false path.
        </p>
      </div>
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import PluginCreatorExpressionInput from '../expressions/PluginCreatorExpressionInput.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { node, updateNodeData } = usePluginCreatorNodeEditorContext(props, emit)
</script>

<style scoped>
.editor-branches {
  padding: var(--sailor-space-3);
  border-radius: var(--sailor-radius-sm);
  background: color-mix(in srgb, var(--sailor-bg-surface) 64%, transparent);
  border: 1px solid var(--sailor-border-subtle);
}

.branches-legend {
  display: flex;
  gap: var(--sailor-space-3);
}

.branch-item {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
}

.branch-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.branch-dot--true {
  background-color: rgb(16, 185, 129);
}

.branch-dot--false {
  background-color: rgb(239, 68, 68);
}

.branch-label {
  font-size: var(--sailor-text-xs);
  font-weight: 700;
}

.branch-label--true {
  color: rgb(16, 185, 129);
}

.branch-label--false {
  color: rgb(239, 68, 68);
}

.editor-hint-text {
  margin: var(--sailor-space-2) 0 0;
  color: var(--sailor-text-muted);
  font-size: 11px;
  font-style: italic;
  line-height: 1.5;
}
</style>
