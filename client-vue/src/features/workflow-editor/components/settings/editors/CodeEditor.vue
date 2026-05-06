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
        <span style="color: var(--nod8-text-primary)">Available:</span>
        <BaseBadge variant="default" size="sm" text="context.trigger" />
        <BaseBadge variant="default" size="sm" text="context.steps" />
        <BaseBadge variant="default" size="sm" text="variables" />
      </div>
      <BaseTextarea
        :model-value="(node.data.script as string) || ''"
        @update:model-value="updateNodeData({ script: $event })"
        :placeholder="`// Access context and variables\nconst items = context.steps.prevStep.output;\nconst result = items.filter(i => i.active);\nreturn result;`"
        spellcheck="false"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'

defineProps<NodeEditorProps>()
</script>

<style scoped></style>
