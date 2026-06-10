<script setup lang="ts">
import { computed } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import type { DatabaseDatasetNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'

const props = defineProps<
  NodeProps<DatabaseDatasetNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'Database Dataset')
const subtitle = computed(() => props.data?.pluginId || 'database')
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
    icon="table-2"
    color="var(--sailor-node-plugin-icon)"
    bg="var(--sailor-node-plugin-bg)"
    border-color="var(--sailor-node-plugin-border)"
  >
    <BaseHandle id="dataset" type="source" :position="Position.Right" />
  </BaseNode>
</template>
