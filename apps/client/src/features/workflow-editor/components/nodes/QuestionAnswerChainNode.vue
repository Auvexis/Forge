<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { QuestionAnswerChainNode } from '@/core/types/workflow.types'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseAdvancedNode from '../BaseAdvancedNode.vue'
import { getAdvancedNodeHandlers } from '../../layout/advancedNodeDefinitions'

const props = defineProps<NodeProps<QuestionAnswerChainNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'; hasOutgoingConnection?: boolean }>()
const handlers = computed(() => getAdvancedNodeHandlers('question-answer-chain'))
</script>

<template>
  <BaseAdvancedNode :id="props.id" :selected="props.selected" :status="props.status" :title="props.data?.name || 'Question and Answer Chain'" description="Retrieval augmented answer" :handlers="handlers" auto-organize has-target has-source :has-outgoing-connection="props.hasOutgoingConnection" bg="transparent" border-color="var(--fabric-node-border)">
    <template #icon-left><LucideIcon name="messages-square" :size="30" style="color: #0891b2" /></template>
  </BaseAdvancedNode>
</template>
