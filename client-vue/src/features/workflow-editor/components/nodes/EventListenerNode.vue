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
  />
</template>
