<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { StructuredJsonParserNode } from '@/core/types/workflow.types'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseAdvancedNode from '../BaseAdvancedNode.vue'
import { getAdvancedNodeHandlers } from '../../layout/advancedNodeDefinitions'

const props = defineProps<NodeProps<StructuredJsonParserNode>>()
const handlers = computed(() => getAdvancedNodeHandlers('structured-json-parser'))
</script>

<template>
  <BaseAdvancedNode class="structured-json-parser-node" :id="props.id" :selected="props.selected" title="" :handlers="handlers" rounded="full" width="100px" height="100px" bg="#fdf2f8" border-color="#f9a8d4">
    <template #icon-left><LucideIcon name="braces" :size="34" style="color: #db2777" /></template>
    <template #label>{{ props.data?.name || 'Structured JSON Parser' }}</template>
  </BaseAdvancedNode>
</template>

<style scoped>
.structured-json-parser-node :deep(.sailor-base-advanced-node__content) { justify-content: center; padding: 0; }
.structured-json-parser-node :deep(.sailor-base-advanced-node__copy) { display: none; }
</style>
