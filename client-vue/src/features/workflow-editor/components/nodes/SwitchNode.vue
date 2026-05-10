<script setup lang="ts">
import { Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { SwitchNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import QuickAddButton from '../QuickAddButton.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<SwitchNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const stepTitle = computed(() => (props.data as any)?.name || 'Switch')
const cases = computed(() => props.data?.cases ?? [])
const hasFallback = computed(() => !!props.data?.fallbackHandleId)

// All outputs in order: cases first, then fallback
const outputs = computed(() => [
  ...cases.value.map((c, index) => ({
    id: c.handleId,
    label: c.value || `case ${index + 1}`,
  })),
  ...(hasFallback.value && props.data?.fallbackHandleId
    ? [{ id: props.data.fallbackHandleId, label: 'default' }]
    : []),
])

// Height grows with the number of outputs: base 40px + 30px per output
const nodeHeight = computed(() => Math.max(100, 40 + outputs.value.length * 30))

// Evenly distribute handle Y positions within [30px, nodeHeight - 30px]
const handlePositions = computed(() => {
  const total = outputs.value.length
  if (total === 0) return []
  if (total === 1) return [nodeHeight.value / 2]
  const startY = 30
  const endY = nodeHeight.value - 30
  const step = (endY - startY) / (total - 1)
  return outputs.value.map((_, i) => startY + step * i)
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
    <!--
      Key includes outputs.length so that when a case is added/removed, Vue
      unmounts and remounts every handle — Vue Flow re-registers them at their
      new positions, which re-anchors all connected edges.
    -->
    <template v-for="(output, i) in outputs" :key="`${output.id}@${outputs.length}`">
      <BaseHandle
        :id="output.id"
        type="source"
        :position="Position.Right"
        :style="`top: ${handlePositions[i]}px`"
      />
      <BaseBadge
        variant="default"
        size="sm"
        class="switch-handle-badge"
        :style="`top: ${handlePositions[i]}px`"
      >
        {{ output.label }}
      </BaseBadge>
      <QuickAddButton
        :node-id="props.id"
        :handle-id="output.id"
        :style="`top: ${handlePositions[i]}px`"
      />
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
  display: block !important;
  box-sizing: border-box;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  z-index: 6;
}
</style>
