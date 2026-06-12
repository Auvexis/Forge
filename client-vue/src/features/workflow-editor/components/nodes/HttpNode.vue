<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { HttpNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<HttpNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const method = computed(() => props.data?.method || 'GET')
const url = computed(() => props.data?.url || 'https://...')
const stepTitle = computed(() => (props.data as any)?.name || 'HTTP Request')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    :title="stepTitle"
    :subtitle="`${method} request`"
    icon="globe"
    color="var(--sailor-node-http-icon)"
    bg="var(--sailor-node-http-bg)"
    border-color="var(--sailor-node-http-border)"
  />
</template>
