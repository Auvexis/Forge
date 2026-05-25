<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="AI Memory"
      />
    </EditorField>

    <EditorField label="Scope">
      <BaseSelect
        :model-value="(node.data.scope as string) || 'session'"
        :options="MEMORY_SCOPES"
        @update:model-value="updateNodeData({ scope: $event as string })"
      />
    </EditorField>

    <EditorField label="Access">
      <div class="editor-switches">
        <BaseSwitch
          :model-value="Boolean(node.data.readEnabled)"
          label="Read memory"
          @update:model-value="updateNodeData({ readEnabled: $event })"
        />
        <BaseSwitch
          :model-value="Boolean(node.data.writeEnabled)"
          label="Write memory"
          @update:model-value="updateNodeData({ writeEnabled: $event })"
        />
      </div>
    </EditorField>

    <EditorField label="Retrieval Limits">
      <div class="editor-grid">
        <BaseInput
          type="number"
          :model-value="Number(node.data.maxRetrievedMemories ?? 4)"
          @update:model-value="updateNodeData({ maxRetrievedMemories: Number($event) })"
          placeholder="Memories"
        />
        <BaseInput
          type="number"
          :model-value="Number(node.data.maxMemoryChars ?? 2000)"
          @update:model-value="updateNodeData({ maxMemoryChars: Number($event) })"
          placeholder="Characters"
        />
      </div>
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'

defineProps<NodeEditorProps>()

const MEMORY_SCOPES = [
  { value: 'none', label: 'None' },
  { value: 'session', label: 'Session' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'profile', label: 'Profile' },
  { value: 'user', label: 'User' },
]
</script>

<style scoped>
.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--sailor-space-2);
}

.editor-switches {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}
</style>
