<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { WaitFormNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'

const props = defineProps<
  NodeProps<WaitFormNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const stepTitle = computed(() => props.data?.name || 'Wait for Form')
const fieldCount = computed(() => props.data?.fields?.length ?? 0)
const subtitle = computed(() => `${fieldCount.value} field${fieldCount.value === 1 ? '' : 's'}`)
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
    icon="clipboard-list"
    color="#22c55e"
    bg="rgba(34, 197, 94, 0.12)"
    border-color="rgba(34, 197, 94, 0.35)"
  />
</template>
