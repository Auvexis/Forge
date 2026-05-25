<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { AiMemoryNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'

const props = defineProps<
  NodeProps<AiMemoryNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => props.data?.name || 'AI Memory')
const scope = computed(() => props.data?.scope || 'session')
const subtitle = computed(() => `${scope.value} memory`)
</script>

<template>
  <div class="agent-config-node agent-config-node--memory">
    <BaseNode
      :id="props.id"
      :selected="props.selected"
      :status="props.status"
      has-source
      :title="stepTitle"
      :subtitle="subtitle"
      icon="database"
      color="rgb(245, 158, 11)"
      bg="rgba(245, 158, 11, 0.12)"
      border-color="rgba(245, 158, 11, 0.45)"
      width="82px"
      height="82px"
    />
  </div>
</template>

<style scoped>
.agent-config-node {
  position: relative;
}

.agent-config-node :deep(.sailor-base-node__icon-box svg) {
  width: 34px;
  height: 34px;
}
</style>
