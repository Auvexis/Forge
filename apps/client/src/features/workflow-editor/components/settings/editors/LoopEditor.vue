<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Iterate over items"
      />
    </EditorField>

    <EditorField label="Collection Path" icon="repeat">
      <div class="editor-hint editor-hint--blue">
        The array to interate over (e.g. from a previous step).
      </div>
      <ExpressionInput
        :model-value="(node.data.collectionPath as string) || ''"
        @update:model-value="updateNodeData({ collectionPath: $event as string })"
        placeholder="steps.fetch_users.output.items"
        style="font-family: var(--fabric-font-mono)"
      />
      <p class="text-xs text-muted-foreground mt-1">
        Supports variable injection via <code v-pre>{{ path }}</code>
      </p>
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'

defineProps<NodeEditorProps>()
</script>

<style scoped>
.text-xs {
  font-size: var(--fabric-text-xs);
}

.text-muted-foreground {
  color: var(--fabric-text-muted);
}

.mt-1 {
  margin-top: var(--fabric-space-1);
}
</style>
