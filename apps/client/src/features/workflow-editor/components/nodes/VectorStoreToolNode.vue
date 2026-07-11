<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { VectorStoreToolNode } from '@/core/types/workflow.types'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseAdvancedNode from '../BaseAdvancedNode.vue'
import { getAdvancedNodeHandlers } from '../../layout/advancedNodeDefinitions'

const props = defineProps<NodeProps<VectorStoreToolNode>>()
const handlers = computed(() => getAdvancedNodeHandlers('vector-store-tool'))
</script>

<template>
  <BaseAdvancedNode :id="props.id" :selected="props.selected" :title="props.data?.name || 'Vector Store Tool'" :description="props.data?.toolName || 'search_documents'" :handlers="handlers" auto-organize rounded="full" bg="transparent" border-color="var(--fabric-node-border)">
    <template #icon-left><LucideIcon name="database-zap" :size="30" style="color: #ea580c" /></template>
  </BaseAdvancedNode>
</template>
