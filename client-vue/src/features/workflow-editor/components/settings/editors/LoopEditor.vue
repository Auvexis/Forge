<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <input
        class="editor-input editor-input--bold"
        :value="node.data.name || ''"
        @input="updateNodeData({ name: ($event.target as HTMLInputElement).value })"
        placeholder="Iterate over items"
      />
    </EditorField>

    <EditorField label="Collection Path" icon="repeat">
      <div class="editor-hint editor-hint--blue">
        The array to interate over (e.g. from a previous step).
      </div>
      <input
        class="editor-input editor-input--mono"
        :value="node.data.collectionPath || ''"
        @input="updateNodeData({ collectionPath: ($event.target as HTMLInputElement).value })"
        placeholder="steps.fetch_users.output.items"
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

defineProps<NodeEditorProps>()
</script>

<style scoped>
.text-xs {
  font-size: var(--nod8-text-xs);
}

.text-muted-foreground {
  color: var(--nod8-text-muted);
}

.mt-1 {
  margin-top: var(--nod8-space-1);
}
</style>
