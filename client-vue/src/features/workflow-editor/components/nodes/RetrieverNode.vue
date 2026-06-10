<script setup lang="ts">
import { computed } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import type { RetrieverNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'

const props = defineProps<
  NodeProps<RetrieverNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'Retriever')
const subtitle = computed(() => `${props.data?.topK ?? 5} results`)
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :has-outgoing-connection="props.hasOutgoingConnection"
    has-target
    has-source
    :title="stepTitle"
    :subtitle="subtitle"
    icon="search"
    color="var(--sailor-node-if-icon)"
    bg="var(--sailor-node-if-bg)"
    border-color="var(--sailor-node-if-border)"
  >
    <BaseHandle id="retrieved" type="source" :position="Position.Right" />
  </BaseNode>
</template>
