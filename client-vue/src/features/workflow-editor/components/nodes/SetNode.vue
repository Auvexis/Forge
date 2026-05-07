<script setup lang="ts">
import { Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { SetNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<SetNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
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
    color="var(--nod8-node-set-icon)"
    bg="var(--nod8-node-set-bg)"
    border-color="var(--nod8-node-set-border)"
  >
    <!-- Single output handle -->
    <BaseHandle id="source" type="source" :position="Position.Right" />
  </BaseNode>
</template>
