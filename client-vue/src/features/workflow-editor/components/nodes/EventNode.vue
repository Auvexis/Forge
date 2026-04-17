<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { EventNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<EventNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const eventName = computed(() => props.data?.eventName || 'event.name')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    title="Emit Event"
    subtitle="Trigger signal"
    icon="zap"
    color="var(--nod8-node-event-icon)"
    bg="var(--nod8-node-event-bg)"
    badge-text="EVENT"
  >
    <div class="nod8-event-body">
      <code class="nod8-event-name" :title="eventName">{{ eventName }}</code>
    </div>
  </BaseNode>
</template>

<style scoped>
.nod8-event-body {
  padding: 0 var(--nod8-space-1);
  width: 100%;
}

.nod8-event-name {
  font-size: var(--nod8-text-xs);
  font-family: var(--nod8-font-mono);
  background-color: var(--nod8-node-event-tag-bg);
  color: var(--nod8-node-event-tag-text);
  padding: 2px 8px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-node-event-tag-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
</style>
