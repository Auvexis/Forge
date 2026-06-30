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
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    :title="stepTitle"
    subtitle="Callable workflow"
    icon="workflow"
    color="var(--sailor-node-call-workflow-icon)"
    bg="var(--sailor-node-call-workflow-bg)"
    border-color="var(--sailor-node-call-workflow-border)"
  />
</template>
