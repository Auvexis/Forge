<script setup lang="ts">
import { computed } from 'vue'
import type { CallWorkflowNode } from '@/core/types/workflow.types'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import BaseNode from '../BaseNode.vue'

const props = defineProps<
  NodeProps<CallWorkflowNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
  }
>()

const stepTitle = computed(() => props.data.name || 'Call Workflow')
const nodeDescription = computed(() => {
  const workflowName = props.data.targetWorkflowName || props.data.targetWorkflowId || 'Select workflow'
  const triggerName = props.data.targetTrigger?.name || props.data.targetTriggerId || 'Select trigger'
  return `${workflowName} | ${triggerName}`
})
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    :title="stepTitle"
    :subtitle="nodeDescription"
    icon="workflow"
    color="var(--fabric-node-call-workflow-icon)"
    bg="var(--fabric-node-call-workflow-bg)"
    border-color="var(--fabric-node-call-workflow-border)"
  />
</template>
