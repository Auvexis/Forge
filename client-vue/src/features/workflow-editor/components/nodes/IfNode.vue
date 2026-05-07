<script setup lang="ts">
import { Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { IfNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<IfNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
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
    color="var(--nod8-node-if-icon)"
    bg="var(--nod8-node-if-bg)"
    border-color="var(--nod8-node-if-border)"
  >
    <!-- True handle (green, top) -->
    <BaseHandle id="then" type="source" :position="Position.Right" style="top: 35%" />
    <BaseBadge variant="default" size="sm" class="if-handle-badge" style="top: 35%; right: -60px">True</BaseBadge>

    <!-- False handle (red, bottom) -->
    <BaseHandle id="else" type="source" :position="Position.Right" style="top: 65%" />
    <BaseBadge variant="default" size="sm" class="if-handle-badge" style="top: 65%; right: -64px">False</BaseBadge>
  </BaseNode>
</template>

<style scoped>
/* Handle labels (True / False) */
.if-handle-badge {
  position: absolute;
  transform: translateY(-50%);
  pointer-events: none;
}
</style>
