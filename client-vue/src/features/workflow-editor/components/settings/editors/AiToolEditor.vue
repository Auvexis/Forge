<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="AI Tool"
      />
    </EditorField>

    <EditorField label="Tool">
      <AgentToolPicker
        :plugin-id="(node.data.pluginId as string) || ''"
        :method-id="(node.data.methodId as string) || ''"
        @select="updateNodeData($event)"
      />
    </EditorField>

    <EditorField label="Side Effect">
      <BaseSelect
        :model-value="(node.data.sideEffect as string) || 'read'"
        :options="SIDE_EFFECTS"
        @update:model-value="updateNodeData({ sideEffect: $event as string })"
      />
    </EditorField>

    <EditorField label="Approval">
      <BaseSwitch
        :model-value="Boolean(node.data.requiresApproval)"
        label="Require approval"
        @update:model-value="updateNodeData({ requiresApproval: $event })"
      />
    </EditorField>

    <EditorField label="Timeout">
      <BaseInput
        type="number"
        :model-value="Number(node.data.timeoutMs ?? 30000)"
        @update:model-value="updateNodeData({ timeoutMs: Number($event) })"
        placeholder="30000"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import AgentToolPicker from '../../agent/AgentToolPicker.vue'

defineProps<NodeEditorProps>()

const SIDE_EFFECTS = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'delete', label: 'Delete' },
  { value: 'external-message', label: 'External Message' },
  { value: 'external-payment', label: 'External Payment' },
  { value: 'filesystem', label: 'Filesystem' },
]
</script>
