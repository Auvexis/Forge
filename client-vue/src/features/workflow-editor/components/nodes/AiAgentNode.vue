<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { AiAgentNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'

const props = defineProps<
  NodeProps<AiAgentNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => props.data?.name || 'AI Agent')
const providerCount = computed(() => props.data?.providerCount ?? 0)
const memoryCount = computed(() => props.data?.memoryCount ?? 0)
const toolCount = computed(() => props.data?.toolCount ?? 0)
const subtitle = computed(() => {
  return `${providerCount.value} models | ${memoryCount.value} memories | ${toolCount.value} tools`
})
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    :title="stepTitle"
    :subtitle="subtitle"
    icon="bot"
    color="rgb(14, 165, 233)"
    bg="rgba(14, 165, 233, 0.12)"
    border-color="rgba(14, 165, 233, 0.45)"
  />
</template>
