<script setup lang="ts">
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { EventNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<EventNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const paramCount = computed(() => (props.data?.payloadParams ?? []).length)
const subtitle = computed(() =>
  paramCount.value === 0
    ? 'Trigger signal'
    : paramCount.value === 1
      ? '1 payload param'
      : `${paramCount.value} payload params`,
)
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
    :subtitle="subtitle"
    icon="zap"
    color="var(--sailor-node-event-icon)"
    bg="var(--sailor-node-event-bg)"
    border-color="var(--sailor-node-event-border)"
  />
</template>
