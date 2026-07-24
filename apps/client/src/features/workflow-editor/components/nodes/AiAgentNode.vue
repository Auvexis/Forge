<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { AiAgentNode } from '@/core/types/workflow.types'
import BaseAdvancedNode from '../BaseAdvancedNode.vue'
import { getAdvancedNodeHandlers } from '../../layout/advancedNodeDefinitions'

const props = defineProps<
  NodeProps<AiAgentNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const displayTitle = computed(() => props.data?.agentDisplayName || props.data?.name || 'AI Agent')
const displayAvatar = computed(() => props.data?.agentEmoji || '🤖')
const handlers = computed(() => getAdvancedNodeHandlers('ai-agent'))
</script>

<template>
  <BaseAdvancedNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :title="displayTitle"
    description="Tools Agent"
    :handlers="handlers"
    auto-organize
    has-target
    has-source
    :has-outgoing-connection="props.hasOutgoingConnection"
    bg="transparent"
    border-color="var(--fabric-node-border)"
  >
    <template #icon-left>
      <span class="ai-agent-node__avatar">{{ displayAvatar }}</span>
    </template>
  </BaseAdvancedNode>
</template>

<style scoped>
.ai-agent-node__avatar {
  color: var(--fabric-ai-agent-node-text-muted);
  font-size: 28px;
}
</style>
