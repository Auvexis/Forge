<script setup lang="ts">
import { computed } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import type { EmbeddingsNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'

const props = defineProps<
  NodeProps<EmbeddingsNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'Embeddings')
const subtitle = computed(() => props.data?.model || props.data?.pluginId || 'model')
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
    icon="scan-text"
    color="var(--sailor-node-ai-icon)"
    bg="var(--sailor-node-ai-bg)"
    border-color="var(--sailor-node-ai-border)"
  >
    <BaseHandle id="vectors" type="source" :position="Position.Right" />
  </BaseNode>
</template>
