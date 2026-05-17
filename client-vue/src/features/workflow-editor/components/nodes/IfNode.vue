<script setup lang="ts">
import { Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { IfNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import QuickAddButton from '../QuickAddButton.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<IfNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const condition = computed(() => props.data?.condition || '—')
const stepTitle = computed(() => (props.data as any)?.name || 'Conditional')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    :title="stepTitle"
    subtitle="If / Else pathing"
    icon="git-branch"
    color="var(--sailor-node-if-icon)"
    bg="var(--sailor-node-if-bg)"
    border-color="var(--sailor-node-if-border)"
  >
    <!-- True handle -->
    <BaseHandle id="then" type="source" :position="Position.Right" style="top: 35%" />
    <BaseBadge variant="default" size="sm" class="if-handle-badge" style="top: 35%; right: -53px">True</BaseBadge>
    <QuickAddButton :node-id="props.id" handle-id="then" style="top: 35%" />

    <!-- False handle -->
    <BaseHandle id="else" type="source" :position="Position.Right" style="top: 65%" />
    <BaseBadge variant="default" size="sm" class="if-handle-badge" style="top: 65%; right: -57px">False</BaseBadge>
    <QuickAddButton :node-id="props.id" handle-id="else" style="top: 65%" />
  </BaseNode>
</template>

<style scoped>
.if-handle-badge {
  position: absolute;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 6;
}
</style>
