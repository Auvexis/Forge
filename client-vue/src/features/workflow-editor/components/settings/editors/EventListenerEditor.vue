<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Wait for event"
      />
    </EditorField>

    <EditorField label="Event Name" icon="target">
      <BaseInput
        :model-value="(node.data.eventName as string) || ''"
        @update:model-value="updateNodeData({ eventName: $event as string })"
        placeholder="user.created"
        style="font-family: var(--nod8-font-mono)"
      />
    </EditorField>

    <EditorField label="Inherited Parameters" icon="arrow-right-from-line">
      <div class="editor-hint editor-hint--amber mb-2">
        This node automatically captures the payload from <b>Emit Event</b> nodes 
        sharing the same event name.
      </div>

      <div class="params-list">
        <div v-for="key in inheritedKeys" :key="key" class="param-row-readonly">
          <LucideIcon name="check-circle-2" :size="14" class="text-green-500" />
          <span class="param-key">{{ key }}</span>
        </div>

        <div v-if="inheritedKeys.length === 0" class="params-empty">
          No 'Emit Event' node found with this event name yet.
        </div>
      </div>
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useWorkflowStore } from '../../../stores/workflow.store'

const props = defineProps<NodeEditorProps>()
const workflowStore = useWorkflowStore()

const inheritedKeys = computed<string[]>(() => {
  const eventName = props.node.data.eventName as string
  if (!eventName) return []
  
  const nodes = workflowStore.activeWorkflow?.nodes || {}
  const keys = new Set<string>()
  
  for (const n of Object.values(nodes)) {
    if (n.type === 'event' && (n as any).eventName === eventName) {
      const params = (n as any).payloadParams || []
      for (const p of params) {
        if (p.key) keys.add(p.key)
      }
    }
  }
  
  return Array.from(keys).sort()
})
</script>

<style scoped>
.mb-2 {
  margin-bottom: var(--nod8-space-2);
}

.params-list {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

.param-row-readonly {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-2) var(--nod8-space-3);
  background: var(--nod8-bg-subtle);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
}

.text-green-500 {
  color: var(--nod8-green-500);
}

.param-key {
  font-family: var(--nod8-font-mono, monospace);
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-primary);
}

.params-empty {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-style: italic;
  padding: var(--nod8-space-2) 0;
}
</style>
