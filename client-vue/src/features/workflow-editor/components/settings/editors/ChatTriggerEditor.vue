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
      <p v-if="publicChatWarning" class="chat-trigger-editor__warning">
        Public chat uses auth and rate limit controls to reduce exposed access.
      </p>
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

    <ChatSessionPanel
      v-if="chatSlug"
      :chat-slug="chatSlug"
      :title="chatTitle || 'Agent Chat'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import ChatSessionPanel from '../../agent/ChatSessionPanel.vue'

const props = defineProps<NodeEditorProps>()

const publicChatWarning = computed(() => props.node.data.chatAuthMode === 'public')
const chatSlug = computed(() => (props.node.data.chatSlug as string | undefined)?.trim() || '')
const chatTitle = computed(() => (props.node.data.chatTitle as string | undefined)?.trim() || '')

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

<style scoped>
.chat-trigger-editor__warning {
  margin: var(--sailor-space-2) 0 0;
  color: var(--sailor-text-warning, var(--sailor-text-secondary));
  font-size: var(--sailor-text-xs);
  line-height: 1.4;
}
</style>
