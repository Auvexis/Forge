<script setup lang="ts">
import { computed } from 'vue'
import { Position } from '@vue-flow/core'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'
import BaseHandle from '../../../workflow-editor/components/BaseHandle.vue'
import QuickAddButton from '../../../workflow-editor/components/QuickAddButton.vue'

interface SwitchCase {
  id?: string
  label?: string
  value?: string
  handle?: string
  handleId?: string
}

const props = defineProps<{ id: string; data: Record<string, unknown>; selected?: boolean }>()

const stepTitle = computed(() => String(props.data.name ?? 'Switch'))
const expression = computed(() => String(props.data.expression ?? 'expression'))
const cases = computed(() =>
  Array.isArray(props.data.cases) ? (props.data.cases as SwitchCase[]) : [],
)
const hasDefault = computed(() => props.data.defaultEnabled !== false)
const outputs = computed(() => [
  ...cases.value.map((item, index) => ({
    id: item.handle ?? item.handleId ?? item.id ?? `case_${index + 1}`,
    label: item.label || item.value || `case ${index + 1}`,
  })),
  ...(hasDefault.value ? [{ id: 'default', label: 'default' }] : []),
])

const nodeHeight = computed(() => Math.max(100, 40 + outputs.value.length * 30))
const handlePositions = computed(() => {
  const total = outputs.value.length
  if (total === 0) return []
  if (total === 1) return [nodeHeight.value / 2]

  const startY = 30
  const endY = nodeHeight.value - 30
  const step = (endY - startY) / (total - 1)
  return outputs.value.map((_, index) => startY + step * index)
})
</script>

<template>
  <BaseNode
    :id="id"
    class="plugin-creator-node"
    :selected="selected"
    :status="data.status as any"
    :height="nodeHeight"
    has-target
    :title="stepTitle"
    subtitle="N-way routing"
    icon="git-branch-plus"
    color="var(--sailor-node-switch-icon)"
    bg="var(--sailor-node-switch-bg)"
    border-color="var(--sailor-node-switch-border)"
  >
    <template #label>
      <div class="plugin-creator-node__label">
        <strong>{{ stepTitle }}</strong>
        <span>{{ expression }}</span>
      </div>
    </template>

    <template v-for="(output, index) in outputs" :key="`${output.id}@${outputs.length}`">
      <BaseHandle
        :id="output.id"
        type="source"
        :position="Position.Right"
        :style="`top: ${handlePositions[index]}px`"
      />
      <BaseBadge
        variant="default"
        size="sm"
        class="switch-handle-badge"
        :style="`top: ${handlePositions[index]}px`"
      >
        {{ output.label }}
      </BaseBadge>
      <QuickAddButton
        :node-id="id"
        :handle-id="output.id"
        :style="`top: ${handlePositions[index]}px`"
      />
    </template>
  </BaseNode>
</template>

<style scoped src="./plugin-creator-node.css"></style>
<style scoped>
.switch-handle-badge {
  position: absolute;
  left: 100%;
  transform: translateY(-50%);
  margin-left: 12px;
  padding: 0 6px;
  pointer-events: none;
  font-size: 10px;
  max-width: 110px;
  display: block;
  box-sizing: border-box;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  z-index: 6;
}
</style>
