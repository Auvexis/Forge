<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { EventNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<EventNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const eventName = computed(() => (props.data as any)?.eventTopic || 'event.topic')
const stepTitle = computed(() => (props.data as any)?.name || 'Emit Event')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    :title="stepTitle"
    subtitle="Trigger signal"
    icon="zap"
    color="var(--nod8-node-event-icon)"
    bg="var(--nod8-node-event-bg)"
    border-color="var(--nod8-node-event-border)"
  />
</template>
