<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { EmbeddingsNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { CONFIGURATION_SOURCE_HANDLER } from '../../layout/advancedNodeDefinitions'
import { usePluginNodePresentation } from '../../composables/usePluginNodePresentation'

const props = defineProps<
  NodeProps<EmbeddingsNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'Embeddings')
const subtitle = computed(() => props.data?.model || props.data?.pluginId || 'model')
const pluginId = computed(() => props.data?.pluginId || '')
const { pluginIcon, customBg, customBorder, customIconColor } = usePluginNodePresentation(pluginId, 'scan-text')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :has-outgoing-connection="props.hasOutgoingConnection"
    :handlers="[CONFIGURATION_SOURCE_HANDLER]"
    rounded="full"
    width="100px"
    height="100px"
    :title="stepTitle"
    :subtitle="subtitle"
    :icon="pluginIcon"
    :color="customIconColor || '#db2777'"
    :bg="customBg || '#fdf2f8'"
    :border-color="customBorder || '#f9a8d4'"
  />
</template>
