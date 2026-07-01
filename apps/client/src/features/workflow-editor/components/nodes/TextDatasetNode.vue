<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { TextDatasetNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { CONFIGURATION_SOURCE_HANDLER } from '../../layout/advancedNodeDefinitions'

const props = defineProps<
  NodeProps<TextDatasetNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'Text Dataset')
const subtitle = computed(() => props.data?.format || 'plain-text')
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
    icon="text"
    color="#0f766e"
    bg="#f0fdfa"
    border-color="#5eead4"
  />
</template>
