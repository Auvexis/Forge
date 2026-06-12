<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { DatabaseDatasetNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'

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
    has-source
    output-position="top"
    rounded="full"
    width="100px"
    height="100px"
    :title="stepTitle"
    :subtitle="subtitle"
    icon="table-2"
    color="#7c3aed"
    bg="#f5f3ff"
    border-color="#c4b5fd"
  />
</template>
