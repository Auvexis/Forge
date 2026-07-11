<script setup lang="ts">
import { Position } from '../nodePresentation.types'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { SetNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import QuickAddButton from '../QuickAddButton.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<SetNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => (props.data as any)?.name || 'Set Fields')
const assignCount = computed(() => props.data?.assignments?.length ?? 0)
const subtitle = computed(() =>
  assignCount.value === 1
    ? '1 field assignment'
    : `${assignCount.value} field assignments`,
)
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    :title="stepTitle"
    :subtitle="subtitle"
    icon="sliders-horizontal"
    color="var(--fabric-node-set-icon)"
    bg="var(--fabric-node-set-bg)"
    border-color="var(--fabric-node-set-border)"
  >
    <BaseHandle id="source" type="source" :position="Position.Right" />
    <QuickAddButton :node-id="props.id" handle-id="source" style="top: 50%" />
  </BaseNode>
</template>
