<script setup lang="ts">
import { Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { LoopNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import QuickAddButton from '../QuickAddButton.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<LoopNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const collection = computed(() => (props.data as any)?.collectionPath || '—')
const maxIterations = computed(() => props.data?.maxIterations || 1000)
const stepTitle = computed(() => (props.data as any)?.name || 'Loop / ForEach')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    :title="stepTitle"
    subtitle="Iterate Array"
    icon="repeat"
    color="var(--sailor-node-loop-icon)"
    bg="var(--sailor-node-loop-bg)"
    border-color="var(--sailor-node-loop-border)"
  >
    <!-- Body handle — fires for each iteration -->
    <BaseHandle id="loop-body" type="source" :position="Position.Right" style="top: 35%" />
    <BaseBadge variant="default" size="sm" class="loop-handle-badge" style="top: 35%; right: -55px">Body</BaseBadge>
    <QuickAddButton :node-id="props.id" handle-id="loop-body" style="top: 35%" />

    <!-- Done handle — fires once all iterations complete -->
    <BaseHandle id="loop-done" type="source" :position="Position.Right" style="top: 65%" />
    <BaseBadge variant="default" size="sm" class="loop-handle-badge" style="top: 65%; right: -56px">Done</BaseBadge>
    <QuickAddButton :node-id="props.id" handle-id="loop-done" style="top: 65%" />
  </BaseNode>
</template>

<style scoped>
.loop-handle-badge {
  position: absolute;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 6000;
}
</style>
