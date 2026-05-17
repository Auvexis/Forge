<script setup lang="ts">
import { Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { SplitInBatchesNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import QuickAddButton from '../QuickAddButton.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<SplitInBatchesNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => (props.data as any)?.name || 'Split In Batches')
const batchSize = computed(() => props.data?.batchSize ?? 10)
const subtitle = computed(() => `${batchSize.value} items per batch`)
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    :title="stepTitle"
    :subtitle="subtitle"
    icon="layers"
    color="var(--sailor-node-split-icon)"
    bg="var(--sailor-node-split-bg)"
    border-color="var(--sailor-node-split-border)"
  >
    <!-- batch handle — fires for each batch -->
    <BaseHandle id="batch-body" type="source" :position="Position.Right" style="top: 35%" />
    <BaseBadge variant="default" size="sm" class="split-badge" style="top: 35%; right: -56px">Batch</BaseBadge>
    <QuickAddButton :node-id="props.id" handle-id="batch-body" style="top: 35%" />

    <!-- done handle — fires once all batches complete -->
    <BaseHandle id="batch-done" type="source" :position="Position.Right" style="top: 65%" />
    <BaseBadge variant="default" size="sm" class="split-badge" style="top: 65%; right: -52px">Done</BaseBadge>
    <QuickAddButton :node-id="props.id" handle-id="batch-done" style="top: 65%" />
  </BaseNode>
</template>

<style scoped>
.split-badge {
  position: absolute;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 10px;
  z-index: 6;
}
</style>
