<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { AiAgentNode } from '@/core/types/workflow.types'
import BaseAdvancedNode from '../BaseAdvancedNode.vue'
import { AI_AGENT_HANDLERS } from '../../layout/advancedNodeDefinitions'

const props = defineProps<
  NodeProps<AiAgentNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const displayTitle = computed(() => props.data?.agentDisplayName || props.data?.name || 'AI Agent')
const displayAvatar = computed(() => props.data?.agentEmoji || '🤖')
</script>

<template>
  <BaseAdvancedNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :title="displayTitle"
    description="Tools Agent"
    :handlers="AI_AGENT_HANDLERS"
    auto-organize
    has-target
    has-source
    :has-outgoing-connection="props.hasOutgoingConnection"
    bg="transparent"
    border-color="var(--sailor-node-border)"
  >
    <template #icon-left>
      <span class="ai-agent-node__avatar">{{ displayAvatar }}</span>
    </template>
  </BaseAdvancedNode>
</template>

<style scoped>
.ai-agent-node__avatar {
  color: var(--sailor-text-muted);
  font-size: 28px;
}
</style>
