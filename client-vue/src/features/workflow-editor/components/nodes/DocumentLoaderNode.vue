<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { DocumentLoaderNode } from '@/core/types/workflow.types'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseAdvancedNode from '../BaseAdvancedNode.vue'
import { getAdvancedNodeHandlers } from '../../layout/advancedNodeDefinitions'

const props = defineProps<
  NodeProps<DocumentLoaderNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
  }
>()

const stepTitle = computed(() => props.data?.name || 'Default Data Loader')
const description = computed(() =>
  props.data?.dataMode === 'specific'
    ? props.data?.dataPath || 'specific data'
    : 'all input data',
)
const handlers = computed(() => getAdvancedNodeHandlers('document-loader'))
</script>

<template>
  <BaseAdvancedNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :title="stepTitle"
    :description="description"
    :handlers="handlers"
    auto-organize
    rounded="full"
    bg="transparent"
    border-color="var(--sailor-node-border)"
  >
    <template #icon-left>
      <LucideIcon
        name="file-search"
        :size="30"
        style="color: #475569"
      />
    </template>
  </BaseAdvancedNode>
</template>
