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
        style="font-family: var(--sailor-font-mono)"
      />
    </EditorField>

    <div v-if="inheritedKeys.length > 0" class="editor-hint editor-hint--amber">
      This node receives <b>{{ inheritedKeys.join(', ') }}</b> from the matching
      Emit Event. Access them via <code class="editor-code-snippet">steps.{{ node.id }}.output.*</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
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
