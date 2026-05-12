<script setup lang="ts">
import { Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { MergeNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import QuickAddButton from '../QuickAddButton.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<MergeNode> & { status?: 'idle' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => (props.data as any)?.name || 'Merge')
const mode = computed(() => props.data?.mode ?? 'wait-any')
const subtitle = computed(() =>
  mode.value === 'wait-all' ? 'Wait for all branches' : 'Wait for any branch',
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
    icon="merge"
    color="var(--nod8-node-merge-icon)"
    bg="var(--nod8-node-merge-bg)"
    border-color="var(--nod8-node-merge-border)"
  >
    <BaseHandle id="source" type="source" :position="Position.Right" />
    <QuickAddButton :node-id="props.id" handle-id="source" style="top: 50%" />
  </BaseNode>
</template>
