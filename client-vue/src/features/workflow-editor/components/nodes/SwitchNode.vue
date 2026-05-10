<script setup lang="ts">
import { Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { SwitchNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<SwitchNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const stepTitle = computed(() => (props.data as any)?.name || 'Switch')
const cases = computed(() => props.data?.cases ?? [])

const outputs = computed(() => [
  ...cases.value.map((switchCase, index) => ({
    id: switchCase.handleId,
    label: switchCase.value || `case ${index + 1}`,
  })),
  ...(props.data?.fallbackHandleId
    ? [{ id: props.data.fallbackHandleId, label: 'default' }]
    : []),
])

const nodeWidth = computed(() => {
  const outputCount = Math.max(outputs.value.length, 1)
  return Math.max(190, 110 + outputCount * 74)
})

const outputPositions = computed(() => {
  const total = outputs.value.length
  if (total === 0) return []

  const minX = 48
  const maxX = nodeWidth.value - 48
  if (total === 1) return [nodeWidth.value / 2]

  const step = (maxX - minX) / (total - 1)
  return outputs.value.map((_, index) => minX + step * index)
})
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :height="104"
    :width="nodeWidth"
    has-target
    color="var(--nod8-node-switch-icon)"
    bg="var(--nod8-node-switch-bg)"
    border-color="var(--nod8-node-switch-border)"
  >
    <div class="switch-node-body">
      <div class="switch-node-icon" aria-hidden="true">
        <LucideIcon name="git-branch-plus" :size="44" />
      </div>
      <div class="switch-node-copy">
        <span class="switch-node-title">{{ stepTitle }}</span>
        <span class="switch-node-subtitle">{{ outputs.length }} outputs</span>
      </div>
    </div>

    <template v-for="(output, i) in outputs" :key="output.id">
      <BaseHandle
        :id="output.id"
        type="source"
        :position="Position.Bottom"
        :style="`left: ${outputPositions[i]}px`"
      />
      <BaseBadge
        variant="default"
        size="sm"
        class="switch-handle-badge"
        :style="`left: ${outputPositions[i]}px`"
      >
        {{ output.label }}
      </BaseBadge>
    </template>
  </BaseNode>
</template>

<style scoped>
.switch-node-body {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  height: 100%;
  padding: 0 22px;
}

.switch-node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  color: var(--nod8-node-switch-icon);
}

.switch-node-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 4px;
}

.switch-node-title {
  color: var(--nod8-text-primary);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.switch-node-subtitle {
  color: var(--nod8-text-muted);
  font-size: 12px;
  line-height: 1.2;
}

.switch-handle-badge {
  position: absolute;
  top: calc(100% + 10px);
  transform: translateX(-50%);
  padding: 0 6px;
  pointer-events: none;
  font-size: 10px;
  max-width: 68px;
  z-index: 4;
  display: block !important;
  box-sizing: border-box;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
