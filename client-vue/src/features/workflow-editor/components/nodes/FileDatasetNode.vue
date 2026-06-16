<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { FileDatasetNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { CONFIGURATION_SOURCE_HANDLER } from '../../layout/advancedNodeDefinitions'

const props = defineProps<
  NodeProps<FileDatasetNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'Extract From File')
const subtitle = computed(() => props.data?.format || 'txt')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :has-outgoing-connection="props.hasOutgoingConnection"
    :handlers="[CONFIGURATION_SOURCE_HANDLER]"
    rounded="full"
    width="100px"
    height="100px"
    :title="stepTitle"
    :subtitle="subtitle"
    icon="file-text"
    color="#2563eb"
    bg="#eff6ff"
    border-color="#93c5fd"
  />
</template>
