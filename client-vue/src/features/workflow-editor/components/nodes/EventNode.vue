<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { EventNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<EventNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
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
    color="var(--nod8-node-event-icon)"
    bg="var(--nod8-node-event-bg)"
    border-color="var(--nod8-node-event-border)"
  />
</template>
