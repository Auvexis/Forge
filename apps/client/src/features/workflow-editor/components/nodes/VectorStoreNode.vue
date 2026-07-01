<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { VectorStoreNode } from '@/core/types/workflow.types'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseAdvancedNode from '../BaseAdvancedNode.vue'
import { getAdvancedNodeHandlers } from '../../layout/advancedNodeDefinitions'
import { usePluginNodePresentation } from '../../composables/usePluginNodePresentation'

const props = defineProps<
  NodeProps<VectorStoreNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'Vector Store')
const subtitle = computed(() => props.data?.collectionName || 'collection')
const pluginId = computed(() => props.data?.pluginId || '')
const handlers = computed(() => getAdvancedNodeHandlers('vector-store'))
const { pluginIcon, customBg, customBorder, customIconColor } = usePluginNodePresentation(pluginId, 'database-zap')
</script>

<template>
  <BaseAdvancedNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :has-outgoing-connection="props.hasOutgoingConnection"
    :title="stepTitle"
    :description="subtitle"
    :handlers="handlers"
    rounded="full"
    width="250px"
    height="75px"
    auto-organize
    has-target
    has-source
    :bg="customBg || 'transparent'"
    :border-color="customBorder || 'var(--sailor-node-border)'"
  >
    <template #icon-left>
      <LucideIcon
        :name="pluginIcon"
        :size="30"
        :style="{ color: customIconColor || 'var(--sailor-node-plugin-icon)' }"
      />
    </template>
  </BaseAdvancedNode>
</template>
