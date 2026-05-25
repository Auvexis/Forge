<template>
  <div class="editor-stack">
    <EditorField label="Chat Slug">
      <BaseInput
        :model-value="(node.data.chatSlug as string) || ''"
        @update:model-value="updateNodeData({ chatSlug: ($event as string) || undefined })"
        placeholder="agent-chat"
      />
    </EditorField>

    <EditorField label="Title">
      <BaseInput
        :model-value="(node.data.chatTitle as string) || ''"
        @update:model-value="updateNodeData({ chatTitle: ($event as string) || undefined })"
        placeholder="Agent Chat"
      />
    </EditorField>

    <EditorField label="Auth Mode">
      <BaseSelect
        :model-value="(node.data.chatAuthMode as string) || 'profile'"
        :options="AUTH_MODES"
        @update:model-value="updateNodeData({ chatAuthMode: $event as string })"
      />
    </EditorField>

    <EditorField label="Session Mode">
      <BaseSelect
        :model-value="(node.data.chatSessionMode as string) || 'resume-by-session-id'"
        :options="SESSION_MODES"
        @update:model-value="updateNodeData({ chatSessionMode: $event as string })"
      />
    </EditorField>

    <EditorField label="Rate Limit">
      <BaseInput
        type="number"
        :model-value="Number(node.data.chatRateLimitPerMinute ?? 30)"
        @update:model-value="updateNodeData({ chatRateLimitPerMinute: Number($event) })"
        placeholder="30"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'

defineProps<NodeEditorProps>()

const AUTH_MODES = [
  { value: 'profile', label: 'Profile' },
  { value: 'signed', label: 'Signed' },
  { value: 'public', label: 'Public' },
]

const SESSION_MODES = [
  { value: 'resume-by-session-id', label: 'Resume by Session ID' },
  { value: 'new-session-per-user', label: 'New Session per User' },
]
</script>
