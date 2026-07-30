<template>
  <section class="workflow-chat-bottom-panel">
    <div class="workflow-chat-bottom-panel__empty">
      <strong>Agent chats moved</strong>
      <span>Use Agents to open the persisted chat interface.</span>
      <RouterLink to="/agents">Open Agents</RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  chatTriggers?: unknown[]
  chatSlug?: string
  title?: string
  workflowId?: string
  triggerNodeId?: string
  devSessionId?: string
  selectedTriggerNodeId?: string
}>()

defineEmits<{
  'update:selectedTriggerNodeId': [triggerNodeId: string]
}>()
</script>

<style scoped>
.workflow-chat-bottom-panel,
.workflow-chat-bottom-panel__empty {
  display: flex;
  height: 100%;
  min-height: 0;
}

.workflow-chat-bottom-panel {
  flex-direction: column;
  background: var(--fabric-workflow-chat-bottom-panel-bg-surface);
}

.workflow-chat-bottom-panel__empty {
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--fabric-space-2);
  color: var(--fabric-workflow-chat-bottom-panel-text-muted);
  text-align: center;
}

.workflow-chat-bottom-panel__empty strong {
  color: var(--fabric-workflow-chat-bottom-panel-text-primary);
  font-size: var(--fabric-text-sm);
}

.workflow-chat-bottom-panel__empty span,
.workflow-chat-bottom-panel__empty a {
  font-size: var(--fabric-text-xs);
}

.workflow-chat-bottom-panel__empty a {
  color: var(--fabric-workflow-chat-bottom-panel-text-primary);
}
</style>
