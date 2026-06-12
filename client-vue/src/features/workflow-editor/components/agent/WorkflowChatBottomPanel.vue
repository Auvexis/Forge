<template>
  <section class="workflow-chat-bottom-panel">
    <div class="workflow-chat-bottom-panel__body">
      <div v-if="!selectedTrigger?.chatSlug" class="workflow-chat-bottom-panel__empty">
        <strong>Configure a Chat Trigger</strong>
        <span>Set Trigger Type = Chat and add a chat slug to test messages here.</span>
      </div>

      <ChatSessionPanel
        v-else
        :chat-slug="selectedTrigger?.chatSlug || ''"
        :title="selectedTrigger?.title || 'Agent Chat'"
        :workflow-id="workflowId"
        :trigger-node-id="selectedTrigger?.triggerNodeId"
        :dev-session-id="devSessionId"
        :chat-triggers="chatTriggers"
        :selected-trigger-node-id="selectedTrigger?.triggerNodeId"
        @update:selected-trigger-node-id="emit('update:selectedTriggerNodeId', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChatSessionPanel from './ChatSessionPanel.vue'

export interface ChatPanelTrigger {
  triggerNodeId: string
  chatSlug?: string
  title?: string
}

const props = withDefaults(defineProps<{
  chatTriggers?: ChatPanelTrigger[]
  chatSlug?: string
  title?: string
  workflowId?: string
  triggerNodeId?: string
  devSessionId?: string
  selectedTriggerNodeId?: string
}>(), {
  chatTriggers: () => [],
})

const emit = defineEmits<{
  'update:selectedTriggerNodeId': [triggerNodeId: string]
}>()

const fallbackTrigger = computed<ChatPanelTrigger | null>(() => {
  if (!props.chatSlug) return null
  return {
    triggerNodeId: props.triggerNodeId || 'trigger',
    chatSlug: props.chatSlug,
    title: props.title || 'Agent Chat',
  }
})
const chatTriggers = computed(() => props.chatTriggers.length ? props.chatTriggers : fallbackTrigger.value ? [fallbackTrigger.value] : [])
const selectedTrigger = computed(() =>
  chatTriggers.value.find((trigger) => trigger.triggerNodeId === props.selectedTriggerNodeId) ??
  chatTriggers.value[0] ??
  null,
)
</script>

<style scoped>
.workflow-chat-bottom-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--sailor-bg-surface);
}

.workflow-chat-bottom-panel__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: var(--sailor-space-3);
}

.workflow-chat-bottom-panel__empty {
  display: flex;
  height: 100%;
  min-height: 140px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-2);
  color: var(--sailor-text-muted);
  text-align: center;
}

.workflow-chat-bottom-panel__empty strong {
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
}

.workflow-chat-bottom-panel__empty span {
  max-width: 420px;
  font-size: var(--sailor-text-xs);
  line-height: 1.5;
}
</style>
