<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Name this code block"
      />
    </EditorField>

    <EditorField label="JavaScript Code" icon="code-2">
      <div class="editor-hint editor-hint--green">
        <span style="color: var(--fabric-code-editor-text-primary)">Available:</span>
        <BaseBadge variant="default" size="sm" text="context.trigger" />
        <BaseBadge variant="default" size="sm" text="context.steps" />
        <BaseBadge variant="default" size="sm" text="variables" />
      </div>
      <BaseCodeEditor
        :model-value="(node.data.script as string) || ''"
        @update:model-value="updateNodeData({ script: $event })"
        language="javascript"
        height="360px"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'

defineProps<NodeEditorProps>()
</script>

<style scoped></style>
