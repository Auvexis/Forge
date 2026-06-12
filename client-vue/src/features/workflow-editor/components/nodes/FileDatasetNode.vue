<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { FileDatasetNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'

const props = defineProps<
  NodeProps<FileDatasetNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'File Dataset')
const subtitle = computed(() => props.data?.format || 'txt')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :has-outgoing-connection="props.hasOutgoingConnection"
    has-source
    output-position="top"
    rounded="full"
    width="100px"
    height="100px"
    :title="stepTitle"
    :subtitle="subtitle"
    icon="file-text"
    color="#2563eb"
    bg="#eff6ff"
    border-color="#93c5fd"
  />
</template>
