<script setup lang="ts">
import { computed } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import type { VectorStoreNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'

const props = defineProps<
  NodeProps<VectorStoreNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'Vector Store')
const subtitle = computed(() => props.data?.collectionName || props.data?.pluginId || 'collection')
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
    icon="database-zap"
    color="var(--sailor-node-merge-icon)"
    bg="var(--sailor-node-merge-bg)"
    border-color="var(--sailor-node-merge-border)"
  >
    <BaseHandle id="store" type="source" :position="Position.Right" />
  </BaseNode>
</template>
