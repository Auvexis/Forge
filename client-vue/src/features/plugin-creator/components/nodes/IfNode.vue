<script setup lang="ts">
import { computed } from 'vue'
import { Position } from '@vue-flow/core'
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'
import BaseHandle from '../../../workflow-editor/components/BaseHandle.vue'
import QuickAddButton from '../../../workflow-editor/components/QuickAddButton.vue'

const props = defineProps<{ id: string; data: Record<string, unknown>; selected?: boolean }>()

const stepTitle = computed(() => String(props.data.name ?? 'Conditional'))
const condition = computed(() => String(props.data.condition ?? 'condition'))
</script>

<template>
  <BaseNode
    :id="id"
    class="plugin-creator-node"
    :selected="selected"
    :status="data.status as any"
    has-target
    :title="stepTitle"
    subtitle="If / Else pathing"
    icon="git-branch"
    color="var(--sailor-node-if-icon)"
    bg="var(--sailor-node-if-bg)"
    border-color="var(--sailor-node-if-border)"
  >
    <template #label>
      <div class="plugin-creator-node__label">
        <strong>{{ stepTitle }}</strong>
        <span>{{ condition }}</span>
      </div>
    </template>

    <BaseHandle id="then" type="source" :position="Position.Right" style="top: 35%" />
    <BaseBadge variant="default" size="sm" class="if-handle-badge" style="top: 35%; right: -53px">
      True
    </BaseBadge>
    <QuickAddButton :node-id="id" handle-id="then" style="top: 35%" />

    <BaseHandle id="else" type="source" :position="Position.Right" style="top: 65%" />
    <BaseBadge variant="default" size="sm" class="if-handle-badge" style="top: 65%; right: -57px">
      False
    </BaseBadge>
    <QuickAddButton :node-id="id" handle-id="else" style="top: 65%" />
  </BaseNode>
</template>

<style scoped src="./plugin-creator-node.css"></style>
<style scoped>
.if-handle-badge {
  position: absolute;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 6;
}
</style>
