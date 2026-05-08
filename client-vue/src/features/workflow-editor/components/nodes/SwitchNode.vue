<script setup lang="ts">
import { Position, Handle } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { SwitchNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<SwitchNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const stepTitle = computed(() => (props.data as any)?.name || 'Switch')
const cases = computed(() => props.data?.cases ?? [])
const hasFallback = computed(() => !!props.data?.fallbackHandleId)

const nodeHeight = computed(() => {
  const total = cases.value.length + (hasFallback.value ? 1 : 0)
  return Math.max(100, 40 + total * 30) // base 40px + 30px per case
})

const handlePositions = computed(() => {
  const total = cases.value.length + (hasFallback.value ? 1 : 0)
  return cases.value.map((_, i) => {
    if (total === 1) return nodeHeight.value / 2
    const startY = 30
    const endY = nodeHeight.value - 30
    const step = (endY - startY) / (total - 1)
    return startY + step * i
  })
})

const fallbackPosition = computed(() => {
  const total = cases.value.length + 1
  if (total === 1) return nodeHeight.value / 2
  const startY = 30
  const endY = nodeHeight.value - 30
  const step = (endY - startY) / (total - 1)
  return startY + step * cases.value.length
})
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :height="nodeHeight"
    has-target
    :title="stepTitle"
    subtitle="N-way routing"
    icon="git-branch-plus"
    color="var(--nod8-node-switch-icon)"
    bg="var(--nod8-node-switch-bg)"
    border-color="var(--nod8-node-switch-border)"
  >
    <!-- Case handles — one per configured case -->
    <template v-for="(c, i) in cases" :key="c.handleId">
      <BaseHandle
        :id="c.handleId"
        type="source"
        :position="Position.Right"
        :style="`top: ${handlePositions[i]}px`"
      />
      <BaseBadge
        variant="default"
        size="sm"
        class="switch-handle-badge"
        :style="`top: ${handlePositions[i]}px;`"
      >
        {{ c.value || `case ${i}` }}
      </BaseBadge>
    </template>

    <!-- Fallback handle -->
    <template v-if="hasFallback && props.data?.fallbackHandleId">
      <BaseHandle
        :id="props.data.fallbackHandleId"
        type="source"
        :position="Position.Right"
        :style="`top: ${fallbackPosition}px`"
      />
      <BaseBadge
        variant="default"
        size="sm"
        class="switch-handle-badge"
        :style="`top: ${fallbackPosition}px;`"
      >
        default
      </BaseBadge>
    </template>
  </BaseNode>
</template>

<style scoped>
.switch-handle-badge {
  position: absolute;
  left: 100%;
  transform: translateY(-50%);
  margin-left: 16px;
  padding: 0 6px;
  pointer-events: none;
  font-size: 10px;
  max-width: 100px;
  
  /* Fix text truncation over padding */
  display: block !important;
  box-sizing: border-box;
  line-height: 18px;
  
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
