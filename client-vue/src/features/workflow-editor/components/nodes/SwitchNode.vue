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

/**
 * Distribute N handles + optional fallback evenly between 20% and 80% of node height.
 * Mirrors the same pattern used by IfNode for "then/else".
 */
const handlePositions = computed(() => {
  const total = cases.value.length + (hasFallback.value ? 1 : 0)
  return cases.value.map((_, i) => {
    const pct = total === 1 ? 50 : 20 + (60 / (total - 1)) * i
    return pct
  })
})

const fallbackPosition = computed(() => {
  const total = cases.value.length + 1
  return 20 + (60 / (total - 1)) * cases.value.length
})
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
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
        :style="`top: ${handlePositions[i]}%`"
      />
      <BaseBadge
        variant="default"
        size="sm"
        class="switch-handle-badge"
        :style="`top: ${handlePositions[i]}%; right: -52px`"
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
        :style="`top: ${fallbackPosition}%`"
      />
      <BaseBadge
        variant="default"
        size="sm"
        class="switch-handle-badge"
        :style="`top: ${fallbackPosition}%; right: -60px`"
      >
        default
      </BaseBadge>
    </template>
  </BaseNode>
</template>

<style scoped>
.switch-handle-badge {
  position: absolute;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 10px;
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
