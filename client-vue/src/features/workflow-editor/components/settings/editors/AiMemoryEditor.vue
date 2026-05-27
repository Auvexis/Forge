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
      <AgentMemoryScopePicker
        :scope="((node.data.scope as string) || 'session') as AgentMemoryScope"
        :read-enabled="Boolean(node.data.readEnabled)"
        :write-enabled="Boolean(node.data.writeEnabled)"
        @update:scope="updateNodeData({ scope: $event })"
        @update:read-enabled="updateNodeData({ readEnabled: $event })"
        @update:write-enabled="updateNodeData({ writeEnabled: $event })"
      />
    </EditorField>

    <EditorField label="Provider Plugin">
      <BaseInput
        :model-value="(node.data.pluginId as string) || 'sailor-internal'"
        disabled
        placeholder="Selected memory plugin"
      />
    </EditorField>

    <EditorField label="Adapter">
      <BaseInput
        :model-value="(node.data.adapter as string) || 'sailor-internal'"
        disabled
        placeholder="sailor-internal"
      />
    </EditorField>

    <EditorField v-if="node.data.searchMethodId || node.data.putMethodId" label="Plugin Methods">
      <div class="editor-grid">
        <BaseInput
          :model-value="(node.data.searchMethodId as string) || ''"
          disabled
          placeholder="searchMethodId"
        />
        <BaseInput
          :model-value="(node.data.putMethodId as string) || ''"
          disabled
          placeholder="putMethodId"
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
import AgentMemoryScopePicker from '../../agent/AgentMemoryScopePicker.vue'
import type { AgentMemoryScope } from '@/features/agent-runtime/types/agent.types'

defineProps<NodeEditorProps>()
</script>

<style scoped>
.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--sailor-space-2);
}

</style>
