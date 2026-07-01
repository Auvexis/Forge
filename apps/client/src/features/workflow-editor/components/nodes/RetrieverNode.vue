<script setup lang="ts">
import { computed } from 'vue'
import { Position } from '../nodePresentation.types'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
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
    color="#65a30d"
    bg="#f7fee7"
    border-color="#bef264"
  >
    <BaseHandle id="retrieved" type="source" :position="Position.Right" />
  </BaseNode>
</template>
