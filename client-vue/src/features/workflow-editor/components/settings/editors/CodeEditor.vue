<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <input
        class="editor-input editor-input--bold"
        :value="node.data.name || ''"
        @input="updateNodeData({ name: ($event.target as HTMLInputElement).value })"
        placeholder="Name this code block"
      />
    </EditorField>

    <EditorField label="JavaScript Code" icon="code-2">
      <div class="editor-hint editor-hint--green">
        Available:
        <span class="editor-code-snippet">context.trigger</span>,
        <span class="editor-code-snippet">context.steps</span>,
        <span class="editor-code-snippet">variables</span>
      </div>
      <textarea
        class="editor-textarea"
        :value="(node.data.script as string) || ''"
        @input="updateNodeData({ script: ($event.target as HTMLTextAreaElement).value })"
        :placeholder="`// Access context and variables\nconst items = context.steps.prevStep.output;\nconst result = items.filter(i => i.active);\nreturn result;`"
        spellcheck="false"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'

defineProps<NodeEditorProps>()
</script>

<style scoped></style>
