<script setup lang="ts">
import { computed } from 'vue'
import type { ReturnNode } from '@/core/types/workflow.types'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import BaseNode from '../BaseNode.vue'

const props = defineProps<
  NodeProps<ReturnNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
  }
>()

const stepTitle = computed(() => props.data.name || 'Return')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    :title="stepTitle"
    subtitle="Workflow result"
    icon="corner-down-left"
    color="var(--sailor-node-return-icon)"
    bg="var(--sailor-node-return-bg)"
    border-color="var(--sailor-node-return-border)"
  />
</template>
