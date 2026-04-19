<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { EventListenerNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<EventListenerNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const eventName = computed(() => (props.data as any)?.eventTopic || 'custom.signal')
const stepTitle = computed(() => (props.data as any)?.name || 'Wait for Event')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    :title="stepTitle"
    subtitle="Listener"
    icon="target"
    color="var(--nod8-node-event-listener-icon)"
    bg="var(--nod8-node-event-listener-bg)"
    badge-text="LISTENER"
  >
    <div class="nod8-listener-body">
      <div class="nod8-listener-label">Wait for:</div>
      <code class="nod8-listener-name" :title="eventName">{{ eventName }}</code>
    </div>
  </BaseNode>
</template>

<style scoped>
.nod8-listener-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 var(--nod8-space-1);
  width: 100%;
}

.nod8-listener-label {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-weight: var(--nod8-font-medium);
}

.nod8-listener-name {
  font-size: var(--nod8-text-xs);
  font-family: var(--nod8-font-mono);
  background-color: var(--nod8-node-listener-tag-bg);
  color: var(--nod8-node-listener-tag-text);
  padding: 2px 8px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-node-listener-tag-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
</style>
