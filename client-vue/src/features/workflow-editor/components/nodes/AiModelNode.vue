<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { AiModelNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'

const props = defineProps<
  NodeProps<AiModelNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => props.data?.name || 'AI Model')
const provider = computed(() => props.data?.provider || 'openai')
const model = computed(() => props.data?.model || 'model')
const subtitle = computed(() => `${provider.value} / ${model.value}`)
</script>

<template>
  <div class="agent-config-node agent-config-node--model">
    <BaseNode
      :id="props.id"
      :selected="props.selected"
      :status="props.status"
      has-source
      :title="stepTitle"
      :subtitle="subtitle"
      icon="brain-circuit"
      color="rgb(16, 185, 129)"
      bg="rgba(16, 185, 129, 0.12)"
      border-color="rgba(16, 185, 129, 0.45)"
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
