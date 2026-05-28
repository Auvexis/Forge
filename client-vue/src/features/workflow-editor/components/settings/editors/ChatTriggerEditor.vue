<template>
  <div class="editor-stack">
    <EditorField label="Chat Slug">
      <div class="chat-trigger-editor__slug-row">
        <BaseInput
          :model-value="(node.data.chatSlug as string) || ''"
          @update:model-value="updateNodeData({ chatSlug: ($event as string) || undefined })"
          placeholder="agent-chat"
        />
        <button
          class="chat-trigger-editor__slug-button"
          type="button"
          title="Generate chat slug"
          @click="updateNodeData({ chatSlug: generateChatSlug() })"
        >
          Generate
        </button>
      </div>
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

    <div class="chat-trigger-editor__panel-hint">
      <strong>Open the Chat panel from the workflow status bar.</strong>
      <span>Use this inspector to configure the trigger, then test messages from the bottom Chat panel.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'

const props = defineProps<NodeEditorProps>()

const publicChatWarning = computed(() => props.node.data.chatAuthMode === 'public')

onMounted(() => {
  if (typeof props.node.data.chatSlug === 'string' && props.node.data.chatSlug.trim()) return
  props.updateNodeData({ chatSlug: generateChatSlug() })
})

function generateChatSlug(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const suffix = Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8)

  return `chat-${suffix || Math.random().toString(36).slice(2, 10)}`
}

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

.chat-trigger-editor__slug-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sailor-space-2);
  align-items: center;
}

.chat-trigger-editor__slug-button {
  height: 32px;
  padding: 0 var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  font-weight: 600;
  cursor: pointer;
}

.chat-trigger-editor__slug-button:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.chat-trigger-editor__panel-hint {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-1);
  padding: var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-overlay);
}

.chat-trigger-editor__panel-hint strong,
.chat-trigger-editor__panel-hint span {
  font-size: var(--sailor-text-xs);
  line-height: 1.4;
}

.chat-trigger-editor__panel-hint strong {
  color: var(--sailor-text-primary);
}

.chat-trigger-editor__panel-hint span {
  color: var(--sailor-text-muted);
}
</style>
