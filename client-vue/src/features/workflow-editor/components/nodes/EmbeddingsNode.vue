<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { EmbeddingsNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { CONFIGURATION_SOURCE_HANDLER } from '../../layout/advancedNodeDefinitions'

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
    :handlers="[CONFIGURATION_SOURCE_HANDLER]"
    rounded="full"
    width="100px"
    height="100px"
    :title="stepTitle"
    :subtitle="subtitle"
    icon="scan-text"
    color="#db2777"
    bg="#fdf2f8"
    border-color="#f9a8d4"
  />
</template>
