<script setup lang="ts">
import { Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { IfNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
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
  >
    <!-- True handle (green, top) -->
    <BaseHandle id="if-true" type="source" :position="Position.Right" style="top: 35%" />
    <span class="if-handle-label if-handle-label--true" style="top: 35%; right: -32px">True</span>

    <!-- False handle (red, bottom) -->
    <BaseHandle id="if-false" type="source" :position="Position.Right" style="top: 65%" />
    <span class="if-handle-label if-handle-label--false" style="top: 65%; right: -34px">False</span>
  </BaseNode>
</template>

<style scoped>
/* Handle labels (True / False) */
.if-handle-label {
  position: absolute;
  font-size: 9px;
  font-weight: 700;
  transform: translateY(-50%);
  pointer-events: none;
  font-family: var(--nod8-font-mono);
}

.if-handle-label--true {
  color: rgb(16, 185, 129);
}

.if-handle-label--false {
  color: rgb(239, 68, 68);
}
</style>
