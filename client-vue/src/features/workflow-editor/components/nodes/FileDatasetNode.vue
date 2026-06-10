<script setup lang="ts">
import { computed } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import type { FileDatasetNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'

const props = defineProps<
  NodeProps<FileDatasetNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'File Dataset')
const subtitle = computed(() => props.data?.format || 'txt')
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
    icon="file-text"
    color="var(--sailor-node-http-icon)"
    bg="var(--sailor-node-http-bg)"
    border-color="var(--sailor-node-http-border)"
  >
    <BaseHandle id="dataset" type="source" :position="Position.Right" />
  </BaseNode>
</template>
