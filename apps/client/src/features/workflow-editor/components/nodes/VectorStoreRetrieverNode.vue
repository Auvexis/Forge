<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { VectorStoreRetrieverNode } from '@/core/types/workflow.types'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseAdvancedNode from '../BaseAdvancedNode.vue'
import { getAdvancedNodeHandlers } from '../../layout/advancedNodeDefinitions'

const props = defineProps<NodeProps<VectorStoreRetrieverNode>>()
const handlers = computed(() => getAdvancedNodeHandlers('vector-store-retriever'))
</script>

<template>
  <BaseAdvancedNode :id="props.id" width="280px" height="75px" rounded="full" :selected="props.selected" :title="props.data?.name || 'Vector Store Retriever'" :description="`${props.data?.topK ?? 5} results`" :handlers="handlers" auto-organize bg="transparent" border-color="var(--fabric-node-border)">
    <template #icon-left><LucideIcon name="search" :size="30" style="color: #65a30d" /></template>
  </BaseAdvancedNode>
</template>
