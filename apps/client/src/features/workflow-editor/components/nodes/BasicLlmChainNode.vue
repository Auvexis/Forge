<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { BasicLlmChainNode } from '@/core/types/workflow.types'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseAdvancedNode from '../BaseAdvancedNode.vue'
import { getAdvancedNodeHandlers } from '../../layout/advancedNodeDefinitions'

const props = defineProps<NodeProps<BasicLlmChainNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'; hasOutgoingConnection?: boolean }>()
const handlers = computed(() => getAdvancedNodeHandlers('basic-llm-chain'))
</script>

<template>
  <BaseAdvancedNode :id="props.id" :selected="props.selected" :status="props.status" :title="props.data?.name || 'Basic LLM Chain'" description="Prompt and response" :handlers="handlers" auto-organize has-target has-source :has-outgoing-connection="props.hasOutgoingConnection" bg="transparent" border-color="var(--fabric-node-border)">
    <template #icon-left><LucideIcon name="message-square-text" :size="30" style="color: #2563eb" /></template>
  </BaseAdvancedNode>
</template>
