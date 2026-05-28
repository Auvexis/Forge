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
    </NodeEditorSection>

    <NodeEditorSection title="Output Branches">
      <div class="editor-branches">
        <span class="editor-field__label">Output Branches</span>
        <div class="branches-legend">
          <BaseBadge variant="success" size="sm" text="Then (true)" />
          <BaseBadge variant="error" size="sm" text="Else (false)" />
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
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
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

.editor-hint-text {
  margin: var(--sailor-space-2) 0 0;
  color: var(--sailor-text-muted);
  font-size: 11px;
  font-style: italic;
  line-height: 1.5;
}
</style>
