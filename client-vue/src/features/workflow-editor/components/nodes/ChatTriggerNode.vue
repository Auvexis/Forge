<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { TriggerNode, WorkflowTrigger } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'

const props = defineProps<
  NodeProps<TriggerNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const triggerData = computed<WorkflowTrigger | undefined>(() => {
  const data = props.data as unknown as TriggerNode | WorkflowTrigger
  if ('trigger' in data && data.trigger) return data.trigger
  return data as WorkflowTrigger
})

const chatSlug = computed(() => triggerData.value?.chatSlug || 'chat')
const chatAuthMode = computed(() => triggerData.value?.chatAuthMode || 'profile')
const chatTitle = computed(() => triggerData.value?.chatTitle || 'Chat Trigger')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-source
    :title="chatTitle"
    :subtitle="`${chatSlug} | ${chatAuthMode}`"
    icon="message-circle"
    color="rgb(20, 184, 166)"
    bg="rgba(20, 184, 166, 0.12)"
    border-color="rgba(20, 184, 166, 0.45)"
  />
</template>
