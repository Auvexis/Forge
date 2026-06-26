<script setup lang="ts">
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { SubWorkflowNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<SubWorkflowNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const workflowId = computed(() => (props.data as any)?.targetWorkflowId || 'not configured')
const stepTitle = computed(() => (props.data as any)?.name || 'Sub-Workflow')
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
