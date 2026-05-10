<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { EventListenerNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'
import { useWorkflowStore } from '../../stores/workflow.store'

const props = defineProps<
  NodeProps<EventListenerNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const workflowStore = useWorkflowStore()

const eventName = computed(() => (props.data as any)?.eventName || 'custom.signal')
const stepTitle = computed(() => (props.data as any)?.name || 'Event Listener')

const paramCount = computed(() => {
  const nodes = workflowStore.activeWorkflow?.nodes || {}
  const keys = new Set<string>()
  for (const n of Object.values(nodes)) {
    if (n.type === 'event' && (n as any).eventName === eventName.value) {
      const params = (n as any).payloadParams || []
      for (const p of params) {
        if (p.key) keys.add(p.key)
      }
    }
  }
  return keys.size
})

const subtitle = computed(() =>
  paramCount.value === 0 ? 'Listener' : `${paramCount.value} payload param${paramCount.value === 1 ? '' : 's'}`,
)
</script>

<template>
  <!--
    EventListenerNode is a trigger-like node: it has NO left (target) handle
    because it starts a new execution branch when an event fires.
    Only has-source (right output handle) is present.
  -->
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-source
    :title="stepTitle"
    :subtitle="subtitle"
    icon="target"
    color="var(--nod8-node-event-listener-icon)"
    bg="var(--nod8-node-event-listener-bg)"
    border-color="var(--nod8-node-event-listener-border)"
  />
</template>
