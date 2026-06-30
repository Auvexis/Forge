<script setup lang="ts">
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { CallWorkflowNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<CallWorkflowNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const workflowId = computed(() => (props.data as any)?.targetWorkflowId || 'not configured')
const stepTitle = computed(() => (props.data as any)?.name || 'Call Workflow')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    :title="stepTitle"
    subtitle="Trigger external flow"
    icon="workflow"
    color="var(--sailor-node-subworkflow-icon)"
    bg="var(--sailor-node-subworkflow-bg)"
    border-color="var(--sailor-node-subworkflow-border)"
  />
</template>
